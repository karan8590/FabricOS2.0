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
        if (newStatus.toUpperCase() === 'DELIVERED' || newStatus.toUpperCase() === 'COMPLETED') {
            // Move reserved to used
            const reservations = (await db.prepare(`SELECT material_id, quantity FROM inventory_history WHERE linked_order_id = ? AND action_type = 'Reserved' AND business_id = ?`).all(orderId, businessId || 'business_001')) as any[];
            for (const res of reservations) {
                await db.prepare(`UPDATE inventory_materials SET reserved_stock = reserved_stock - ?, used_stock = used_stock + ? WHERE id = ? AND business_id = ?`).run(res.quantity, res.quantity, res.material_id, businessId || 'business_001');
                
                // Fetch new state for logging
                const m = (await db.prepare('SELECT used_stock FROM inventory_materials WHERE id = ? AND business_id = ?').get(res.material_id, businessId || 'business_001')) as any;
                
                await db.prepare(`
                    INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, linked_order_id, user_id)
                    VALUES (?, ?, 'Used', ?, ?, ?, ?, ?, ?)
                `).run(businessId || 'business_001', res.material_id, res.quantity, Number(m.used_stock) - res.quantity, m.used_stock, `Order #${orderId} Completed`, orderId, user?.id || 1);
            }
        } else if (newStatus.toUpperCase() === 'CANCELLED') {
            // Move reserved back to available
            const reservations = (await db.prepare(`SELECT material_id, quantity FROM inventory_history WHERE linked_order_id = ? AND action_type = 'Reserved' AND business_id = ?`).all(orderId, businessId || 'business_001')) as any[];
            for (const res of reservations) {
                await db.prepare(`UPDATE inventory_materials SET reserved_stock = reserved_stock - ?, available_stock = available_stock + ? WHERE id = ? AND business_id = ?`).run(res.quantity, res.quantity, res.material_id, businessId || 'business_001');
                
                // Fetch new state for logging
                const m = (await db.prepare('SELECT available_stock FROM inventory_materials WHERE id = ? AND business_id = ?').get(res.material_id, businessId || 'business_001')) as any;
                
                await db.prepare(`
                    INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, linked_order_id, user_id)
                    VALUES (?, ?, 'Released', ?, ?, ?, ?, ?, ?)
                `).run(businessId || 'business_001', res.material_id, res.quantity, Number(m.available_stock) - res.quantity, m.available_stock, `Order #${orderId} Cancelled`, orderId, user?.id || 1);
            }
        }

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
