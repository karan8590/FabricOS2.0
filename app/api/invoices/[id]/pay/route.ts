import { NextResponse } from 'next/server';
import { checkPermission } from '@/lib/auth/permissions';
import getDatabase from '@/lib/db';
import { NotificationService } from '@/lib/notifications/service';
import { sendTelegramMessage } from '@/lib/telegram';
import { logAction } from '@/lib/auditLogger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { authorized, user, error, status } = await checkPermission('invoices.pay');
        if (!authorized) return NextResponse.json({ error }, { status });

        const { id } = await params;
        const { amount, date, notes } = await request.json();
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const db = getDatabase();

        // 1. Get current invoice
        const invoice = (await db.prepare('SELECT * FROM invoices WHERE id = ?').get(id)) as any;
        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

        // 2. Insert Payment Record (The Ledger)
        const paymentDate = date ? Math.floor(new Date(date).getTime() / 1000) : Math.floor(Date.now() / 1000);

        (await db.prepare(`
            INSERT INTO payments (invoice_id, customer_id, amount, method, payment_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, invoice.customer_id, paymentAmount, 'bank_transfer', paymentDate, notes || ''));

        // Auto-create a Cash IN entry in expenses table (Cash Book)
        try {
            const customerObj = (await db.prepare('SELECT name FROM customers WHERE id = ?').get(invoice.customer_id)) as any;
            const customerName = customerObj?.name || 'Customer';
            const userId = user ? (user.userId || user.id) : null;
            (await db.prepare(`
                INSERT INTO expenses (
                    category, amount, date, description, paymentMode, reference, notes, 
                    addedBy, created_by_user_id, isAuto, linkedId, type, customerName, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'in', ?, (EXTRACT(EPOCH FROM NOW()))::integer)
            `).run(
                            'Invoice Payment',
                            paymentAmount,
                            paymentDate,
                            `${customerName} — ${invoice.invoice_number} payment`,
                            'NEFT',
                            '',
                            notes || '',
                            userId,
                            userId,
                            id,
                            customerName
                        ));
        } catch (e) {
            console.error('Failed to auto-create Cash IN entry for invoice payment:', e);
        }

        // 3. Recalculate Totals from Ledger (Safety First)
        const result = (await db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?').get(id)) as any;
        const newPaid = result.total_paid || 0;
        const totalAmount = invoice.amount;

        // 4. Determine Status
        let newStatus = invoice.status;
        if (newPaid >= totalAmount) {
            newStatus = 'paid';
        } else if (newPaid > 0) {
            newStatus = 'partial';
        } else {
            newStatus = 'unpaid';
        }

        // 5. Update Invoice
        (await db.prepare(`
            UPDATE invoices 
            SET amount_paid = ?, status = ?, last_payment_date = ?
            WHERE id = ?
        `).run(newPaid, newStatus, paymentDate, id));

        // 6. Notify
        // Trigger notification of type payment_received for all admins and managers
        const admins = (await db.prepare("SELECT id FROM users WHERE role IN ('admin', 'manager')").all()) as any[];
        for (const admin of admins) {
            await NotificationService.send({
                userId: admin.id,
                type: 'payment_received',
                title: 'Payment Received',
                message: `Payment of ₹${paymentAmount} received for Invoice #${invoice.invoice_number}.`,
                meta: { invoiceId: id, paymentAmount }
            });
        }

        // Send Telegram Notification
        try {
            const notifyPaymentRow = (await db.prepare("SELECT value FROM settings WHERE key = 'notify_payment_received'").get()) as any;
            const notifyPayment = (notifyPaymentRow?.value ?? 'on') === 'on';

            if (notifyPayment) {
                const customerObj = (await db.prepare('SELECT name FROM customers WHERE id = ?').get(invoice.customer_id)) as any;
                const customerName = customerObj?.name || 'Unknown Customer';
                
                let mode = 'NEFT';
                let reference = notes || 'N/A';
                const lowerNotes = (notes || '').toLowerCase();
                if (lowerNotes.includes('cash')) {
                    mode = 'Cash';
                } else if (lowerNotes.includes('cheque') || lowerNotes.includes('check')) {
                    mode = 'Cheque';
                } else if (lowerNotes.includes('upi') || lowerNotes.includes('gpay') || lowerNotes.includes('phonepe') || lowerNotes.includes('paytm')) {
                    mode = 'UPI';
                } else if (lowerNotes.includes('rtgs')) {
                    mode = 'RTGS';
                }

                const isFullyPaid = newPaid >= totalAmount;
                const balanceText = isFullyPaid 
                    ? 'Invoice fully paid.' 
                    : `Invoice partially paid. Balance remaining: ₹${Math.max(0, totalAmount - newPaid).toLocaleString('en-IN')}`;
                const balanceTextGuj = isFullyPaid
                    ? 'ઇન્વૉઇસ સંપૂર્ણ ચૂકવાઈ ગઈ.'
                    : `ઇન્વૉઇસ આંશિક ચૂકવાઈ. બાકી: ₹${Math.max(0, totalAmount - newPaid).toLocaleString('en-IN')}`;

                const payloadText = {
                    english: `💸 *Payment Received*\n\n*Customer:* ${customerName}\n*Invoice:* ${invoice.invoice_number}\n*Amount received:* ₹${paymentAmount.toLocaleString('en-IN')}\n*Mode:* ${mode}\n*Ref:* ${reference}\n\n${balanceText}`,
                    gujarati: `💸 *ચૂકવણી પ્રાપ્ત થઈ*\n\n*ગ્રાહક:* ${customerName}\n*ઇન્વૉઇસ:* ${invoice.invoice_number}\n*પ્રાપ્ત રકમ:* ₹${paymentAmount.toLocaleString('en-IN')}\n*પ્રકાર:* ${mode}\n*સંદર્ભ:* ${reference}\n\n${balanceTextGuj}`
                };

                await sendTelegramMessage(payloadText, 'instant_order_alerts');
            }
        } catch (tgError) {
            console.error('Failed to send Telegram notification for payment:', tgError);
        }

        const customer = (await db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id)) as any;
        if (customer && customer.phone) {
            await NotificationService.sendWhatsApp(customer.phone, 'payment_received', {
                invoiceNumber: invoice.invoice_number,
                amount: paymentAmount
            });
        }

        // Audit log: payment
        await logAction({
            action: 'payment',
            entity: 'invoice',
            entityId: id,
            entityLabel: `Invoice #${invoice.invoice_number}`,
            changes: { amount: paymentAmount, status: { old: invoice.status, new: newStatus } }
        });

        return NextResponse.json({ success: true, newStatus, newPaid });

    } catch (error) {
        console.error('Payment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
