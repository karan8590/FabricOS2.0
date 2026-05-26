import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildOrderAlertTemplate } from '@/lib/telegram-templates';
import { logAction } from '@/lib/auditLogger';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status: permStatus, user } = await checkPermission('orders.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status: permStatus });
        }

        const { status: newStatus } = await request.json();
        const orderId = parseInt(params.id);

        const db = getDatabase();

        // Get current order and customer
        const order = (await db.prepare('SELECT customer_id, business_id FROM orders WHERE id = ?').get(orderId)) as any;
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        const businessId = user?.businessId || order.business_id;

        // Update status
        (await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, orderId));

        // Audit Logging
        await logAction({
            userId: user?.userId?.toString() || user?.id?.toString() || 'system',
            userName: user?.name || 'System',
            userRole: user?.role || 'system',
            action: 'update_status',
            entity: 'order',
            entityId: orderId.toString(),
            changes: { newStatus }
        });

        // Log Activity
        let title = '';
        let description = '';
        switch (newStatus.toUpperCase()) {
            case 'APPROVED': 
                title = 'Order Approved'; 
                description = `Order #${orderId} has been approved and moved to production.`; 
                break;
            case 'READY': 
                title = 'Production Completed'; 
                description = `Order #${orderId} is now ready for delivery.`; 
                break;
            case 'DELIVERED': 
                title = 'Order Delivered'; 
                description = `Order #${orderId} has been successfully delivered.`; 
                break;
            default:
                title = `Status Updated: ${newStatus}`;
                description = `Order #${orderId} status changed to ${newStatus}.`;
        }

        (await db.prepare(`
            INSERT INTO activity (business_id, customer_id, type, title, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(businessId || order.business_id || 'business_001', order.customer_id, newStatus === 'approved' ? 'production_started' : 'delivered', title, description, Math.floor(Date.now() / 1000)));

        // --- Inventory Reservation Resolution ---
        // Dynamically recalculate all material stocks now that order status has changed
        const { syncAllMaterialStocks } = await import('@/lib/inventory/sync');
        await syncAllMaterialStocks(db, businessId || 'business_001');

        // Trigger Telegram instant_order_alerts for key status changes
        try {
            const triggerStatuses = ['dispatched', 'delivered', 'approved', 'ready'];
            if (triggerStatuses.includes(newStatus?.toLowerCase())) {
                const orderInfo = (await db.prepare(`
                    SELECT o.order_number, o.total_price, o.quantity_meters, c.name as customer_name, d.name as design_name
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    JOIN designs d ON o.design_id = d.id
                    WHERE o.id = ?
                `).get(orderId)) as any;

                if (orderInfo) {
                    const statusLabel: Record<string, { en: string; guj: string }> = {
                        approved: { en: '✅ Order Approved', guj: '✅ ઓર્ડર મંજૂર' },
                        ready: { en: '📦 Order Ready', guj: '📦 ઓર્ડર તૈયાર' },
                        dispatched: { en: '🚚 Order Dispatched', guj: '🚚 ઓર્ડર રવાના' },
                        delivered: { en: '✔️ Order Delivered', guj: '✔️ ઓર્ડર ડિલિવર' },
                    };
                    const label = statusLabel[newStatus.toLowerCase()] || { en: newStatus, guj: newStatus };

                    const payloadText = buildOrderAlertTemplate({
                        statusLabel: label,
                        orderNo: orderInfo.order_number,
                        customerName: orderInfo.customer_name,
                        designName: orderInfo.design_name,
                        quantity: orderInfo.quantity_meters,
                        value: orderInfo.total_price
                    });
                    
                    sendTelegramMessage(payloadText, 'instant_order_alerts').catch(console.error);
                }
            }
        } catch (tgErr) {
            console.error('[Telegram ERROR] instant_order_alerts dispatch failed:', tgErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Status update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
