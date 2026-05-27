import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { logAction } from '@/lib/auditLogger';

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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const businessId = user.businessId;
        
        const paymentId = parseInt((await params).id, 10);
        if (isNaN(paymentId)) {
            return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
        }

        const body = await request.json();
        const { cost, notes } = body;

        const amount = parseFloat(cost);
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Invalid cost amount' }, { status: 400 });
        }

        const db = getDatabase();

        // Verify the payment exists and is actually a pending_cost transport payment
        const payment = (await db.prepare(`
            SELECT * FROM vendor_payments 
            WHERE id = ? AND business_id = ? AND work_type = 'transport'
        `).get(paymentId, businessId)) as any;

        if (!payment) {
            return NextResponse.json({ error: 'Transport payment not found' }, { status: 404 });
        }
        
        if (payment.status !== 'pending_cost' && payment.total_amount > 0) {
             return NextResponse.json({ error: 'Payment already has an amount set' }, { status: 400 });
        }

        // Run transaction
        await db.transaction(async () => {
            // 1. Update vendor_payments
            await db.prepare(`
                UPDATE vendor_payments 
                SET total_amount = ?, balance = ?, status = 'unpaid', notes = COALESCE(notes || '\n', '') || ?
                WHERE id = ? AND business_id = ?
            `).run(amount, amount, notes ? `Added Cost Note: ${notes}` : '', paymentId, businessId);

            // 2. Update dispatch_batches if linked
            if (payment.dispatch_id) {
                await db.prepare(`
                    UPDATE dispatch_batches 
                    SET delivery_cost = ? 
                    WHERE id = ? AND business_id = ?
                `).run(amount, payment.dispatch_id, businessId);
            }

            // 3. Update vendor balance
            await db.prepare(`
                UPDATE vendors
                SET balance = balance + ?
                WHERE id = ? AND business_id = ?
            `).run(amount, payment.vendor_id, businessId);
            
            // 4. Log Audit Action
            await logAction({
                action: 'update',
                entity: 'vendor_payment',
                entityId: payment.id.toString(),
                entityLabel: `Transport Cost for Dispatch ${payment.dispatch_id || 'Unknown'}`,
                changes: { previous_amount: 0, new_amount: amount, notes },
                businessId
            });
        })();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Transport cost add error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
