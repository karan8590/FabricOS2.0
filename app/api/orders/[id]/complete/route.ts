import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { NotificationService } from '@/lib/notifications/service';
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
                    "UPDATE orders SET status = 'completed', completed_at = ? WHERE id = ?"
                ).run(now, orderId));

        // Trigger Notification: order_completed for all admins and managers
        const orderInfo = (await db.prepare(`
            SELECT o.order_number, o.total_price, o.quantity_meters, c.name as customer_name, d.name as design_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.id = ?
        `).get(orderId)) as any;

        if (orderInfo) {
            const admins = (await db.prepare("SELECT id FROM users WHERE role IN ('admin', 'manager')").all()) as any[];
            for (const admin of admins) {
                await NotificationService.send({
                    userId: admin.id,
                    type: 'order_completed',
                    title: 'Order Completed',
                    message: `Order #${orderInfo.order_number} has been marked as completed.`,
                    meta: { orderId }
                });
            }

            // Trigger Telegram instant_order_alerts for completion
            try {
                const payloadText = buildOrderAlertTemplate({
                    statusLabel: { en: '🏁 Order Completed', guj: '🏁 ઓર્ડર પૂર્ણ થયો' },
                    orderNo: orderInfo.order_number,
                    customerName: orderInfo.customer_name,
                    designName: orderInfo.design_name,
                    quantity: orderInfo.quantity_meters,
                    value: orderInfo.total_price
                });
                sendTelegramMessage(payloadText, 'instant_order_alerts').catch(console.error);
            } catch (tgErr) {
                console.error('[Telegram ERROR] instant_order_alerts completion dispatch failed:', tgErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Complete order error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
