import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildOrderAlertTemplate } from '@/lib/telegram-templates';

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role === 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const orderId = parseInt(params.id);
        const db = getDatabase();

        const now = Math.floor(Date.now() / 1000);

        (await db.prepare(
                    "UPDATE orders SET status = 'approved', approved_at = ? WHERE id = ?"
                ).run(now, orderId));

        // Trigger Telegram instant_order_alerts for approval
        try {
            const orderInfo = (await db.prepare(`
                SELECT o.order_number, o.total_price, o.quantity_meters, c.name as customer_name, d.name as design_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                JOIN designs d ON o.design_id = d.id
                WHERE o.id = ?
            `).get(orderId)) as any;

            if (orderInfo) {
                const payloadText = buildOrderAlertTemplate({
                    statusLabel: { en: '✅ Order Approved', guj: '✅ ઓર્ડર મંજૂર' },
                    orderNo: orderInfo.order_number,
                    customerName: orderInfo.customer_name,
                    designName: orderInfo.design_name,
                    quantity: orderInfo.quantity_meters,
                    value: orderInfo.total_price
                });
                sendTelegramMessage(payloadText, 'instant_order_alerts').catch(console.error);
            }
        } catch (tgErr) {
            console.error('[Telegram ERROR] instant_order_alerts approval dispatch failed:', tgErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Approve order error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
