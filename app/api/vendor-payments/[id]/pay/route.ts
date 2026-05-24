import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { sendTelegramMessage } from '@/lib/telegram';
import { logAction } from '@/lib/auditLogger';

// Helper to check authentication
async function getAuthenticatedUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;
        return verifyToken(token);
    } catch {
        return null;
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const paymentId = parseInt(params.id);
        const body = await request.json();

        const {
            amount, // amount being paid now
            payment_date, // YYYY-MM-DD
            payment_mode, // Cash / NEFT / UPI / Cheque / Bank transfer
            reference, // UTR / Tx ID
            notes
        } = body;

        if (!amount || amount <= 0 || !payment_date || !payment_mode) {
            return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
        }

        const db = getDatabase();

        // 1. Fetch vendor payment record
        const payment = (await db.prepare('SELECT * FROM vendor_payments WHERE id = ?').get(paymentId)) as any;
        if (!payment) {
            return NextResponse.json({ error: 'Vendor payment duty not found' }, { status: 404 });
        }

        if (amount > payment.balance) {
            return NextResponse.json({ error: `Amount exceeds outstanding balance of ₹${payment.balance}` }, { status: 400 });
        }

        // Start database transaction
        const payTx = db.transaction(async () => {
            // 2. Insert instalment record
            (await db.prepare(`
                INSERT INTO vendor_payment_instalments (
                    vendor_payment_id, date, amount, payment_mode, reference, notes
                ) VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                            paymentId,
                            payment_date,
                            amount,
                            payment_mode,
                            reference || '',
                            notes || ''
                        ));

            // Fetch current instalment index
            const countRow = (await db.prepare('SELECT COUNT(*) AS count FROM vendor_payment_instalments WHERE vendor_payment_id = ?').get(paymentId)) as any;
            const instalmentIndex = countRow?.count || 1;

            // 3. Calculate new status and balances
            const newAmountPaid = payment.amount_paid + amount;
            const newBalance = payment.balance - amount;
            const todayStr = new Date().toISOString().split('T')[0];

            let newStatus = 'unpaid';
            if (newBalance <= 0) {
                newStatus = 'paid';
            } else if (newAmountPaid > 0) {
                newStatus = 'partial';
            } else if (payment.due_date < todayStr) {
                newStatus = 'overdue';
            }

            // Check if ITC should be claimed (only if paid in full and has_gst)
            let itcQueryAddendum = '';
            let itcValues: any[] = [];
            
            if (newStatus === 'paid' && payment.has_gst === 1) {
                itcQueryAddendum = `, itc_claimed = 1, itc_amount = ?, itc_claimed_date = CAST(strftime('%s', 'now') AS INTEGER)`;
                itcValues.push(payment.gst_amount);
                
                // Update linked job cost if exists
                if (payment.linked_job_cost_id) {
                    (await db.prepare('UPDATE order_job_costs SET itc_claimed = 1 WHERE id = ?').run(payment.linked_job_cost_id));
                    
                    // Update linked expense (Cash Book entry)
                    if (payment.order_id) {
                        const linkedExpenseId = `order:${payment.order_id}:cost:${payment.linked_job_cost_id}`;
                        (await db.prepare('UPDATE expenses SET itc_claimed = 1 WHERE linkedId = ?').run(linkedExpenseId));
                    }
                }
            }

            // Update vendor_payments record
            (await db.prepare(`
                UPDATE vendor_payments 
                SET amount_paid = ?, balance = ?, status = ?${itcQueryAddendum}
                WHERE id = ?
            `).run(
                            newAmountPaid,
                            newBalance,
                            newStatus,
                            ...itcValues,
                            paymentId
                        ));

            // 4. Auto-create Cash Book expense (Cash OUT)
            const category = payment.work_type === 'embroidery' ? 'Embroidery Work' : 'Dyeing Work';
            const workDisplay = payment.work_type === 'embroidery' ? 'Embroidery' : 'Dyeing';
            
            // Build informative description
            const orderRef = payment.order_number ? `#${payment.order_number}` : `Order #${payment.order_id || 'manual'}`;
            const description = `${payment.vendor_name} payment — ${workDisplay} for ${orderRef} (instalment ${instalmentIndex})`;
            const dateTimestamp = Math.floor(new Date(payment_date).getTime() / 1000);
            const linkedId = `vendor_payment:${paymentId}:instalment:${instalmentIndex}`;

            (await db.prepare(`
                INSERT INTO expenses (
                    category, amount, date, description, paymentMode, reference, notes, 
                    addedBy, created_by_user_id, isAuto, linkedId, type, customerName, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'out', ?, CAST(strftime('%s', 'now') AS INTEGER))
            `).run(
                            category,
                            amount,
                            dateTimestamp,
                            description,
                            payment_mode,
                            reference || '',
                            notes || '',
                            user.userId,
                            user.userId,
                            linkedId,
                            payment.vendor_name
                        ));

            return { newAmountPaid, newBalance, newStatus };
        });

        const result = await payTx();

        // Send Telegram Notification
        try {
            const notifyVendorRow = (await db.prepare("SELECT value FROM settings WHERE key = 'notify_vendor_payment'").get()) as any;
            const notifyVendor = (notifyVendorRow?.value ?? 'on') === 'on';

            if (notifyVendor) {
                const workDisplay = payment.work_type.charAt(0).toUpperCase() + payment.work_type.slice(1);
                const orderRef = payment.order_number ? `#${payment.order_number}` : `Order #${payment.order_id || 'manual'}`;
                const balanceRemaining = result.newBalance;

                const payloadText = {
                    english: `⚠️ *Vendor Payment Recorded*\n\n*Vendor:* ${payment.vendor_name}\n*Work:* ${workDisplay} — ${orderRef}\n*Amount paid:* ₹${amount.toLocaleString('en-IN')}\n*Mode:* ${payment_mode}\n*Balance remaining:* ₹${balanceRemaining.toLocaleString('en-IN')}`,
                    gujarati: `⚠️ *વિક્રેતા ચૂકવણી નોંધાઈ*\n\n*વિક્રેતા:* ${payment.vendor_name}\n*કામ:* ${workDisplay} — ${orderRef}\n*ચૂકવેલ રકમ:* ₹${amount.toLocaleString('en-IN')}\n*પ્રકાર:* ${payment_mode}\n*બાકી રકમ:* ₹${balanceRemaining.toLocaleString('en-IN')}`
                };

                await sendTelegramMessage(payloadText, 'vendor_alerts');
            }
        } catch (tgError) {
            console.error('Failed to send Telegram notification for vendor payment:', tgError);
        }

        // Audit log: vendor instalment payment
        await logAction({
            action: 'payment',
            entity: 'vendor_payment',
            entityId: paymentId.toString(),
            entityLabel: `${payment.vendor_name} instalment`,
            changes: { amount, payment_mode, reference, newStatus: result.newStatus }
        });

        return NextResponse.json({
            success: true,
            message: `Payment of ₹${amount.toLocaleString('en-IN')} recorded for ${payment.vendor_name}`,
            ...result
        });
    } catch (error) {
        console.error('Record vendor payment instalment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
