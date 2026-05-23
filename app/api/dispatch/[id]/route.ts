import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildOrderAlertTemplate } from '@/lib/telegram-templates';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const db = getDatabase();
        const dispatchId = params.id;

        const dispatchBatch = (await db.prepare(`
            SELECT * FROM dispatch_batches 
            WHERE id = ? AND business_id = ?
        `).get(dispatchId, businessId));

        if (!dispatchBatch) return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });

        const dispatchOrders = (await db.prepare(`
            SELECT 
                do.*,
                o.order_number, o.quantity_meters, o.total_price, o.status as order_status, o.customer_id,
                c.name as customer_name, c.phone as customer_phone,
                d.name as design_name
            FROM dispatch_orders do
            JOIN orders o ON do.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE do.dispatch_id = ? AND do.business_id = ?
        `).all(dispatchId, businessId));

        return NextResponse.json({ dispatch: dispatchBatch, orders: dispatchOrders });
    } catch (error: any) {
        console.error('Dispatch GET Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        const { dispatchOrderId, orderId, action } = body;
        const dispatchId = params.id;

        const db = getDatabase();
        db.exec('BEGIN TRANSACTION');

        try {
            if (action === 'mark_delivered') {
                const now = Math.floor(Date.now() / 1000);
                
                // Update dispatch_orders
                (await db.prepare(`
                    UPDATE dispatch_orders 
                    SET delivery_status = 'delivered', delivered_at = ? 
                    WHERE id = ? AND business_id = ?
                `).run(now, dispatchOrderId, businessId));

                // Update orders
                (await db.prepare(`
                    UPDATE orders 
                    SET status = 'delivered' 
                    WHERE id = ? AND business_id = ?
                `).run(orderId, businessId));

                // Log Activity
                const orderData = (await db.prepare('SELECT customer_id, order_number, quantity_meters, total_price, (SELECT name FROM customers WHERE id = orders.customer_id) as customer_name, (SELECT name FROM designs WHERE id = orders.design_id) as design_name FROM orders WHERE id = ?').get(orderId)) as any;
                
                if (orderData) {
                    (await db.prepare(`
                        INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                                            businessId, 
                                            orderData.customer_id, 
                                            'production_workflow', 
                                            'Order Delivered', 
                                            `Order successfully delivered via dispatch.`,
                                            JSON.stringify({ order_id: orderId, dispatch_id: dispatchId, action: 'delivered' }), 
                                            now
                                        ));
                    
                    // Telegram Alert
                    const statusLabel = { en: '✔️ Order Delivered', guj: '✔️ ઓર્ડર ડિલિવર' };
                    const payloadText = buildOrderAlertTemplate({
                        statusLabel: statusLabel,
                        orderNo: orderData.order_number,
                        customerName: orderData.customer_name,
                        designName: orderData.design_name,
                        quantity: orderData.quantity_meters,
                        value: orderData.total_price
                    });
                    
                    sendTelegramMessage(payloadText, 'instant_order_alerts').catch(console.error);
                }

                // Check if all orders in this dispatch are delivered
                const pendingOrders = (await db.prepare(`
                    SELECT COUNT(*) as count FROM dispatch_orders 
                    WHERE dispatch_id = ? AND delivery_status != 'delivered'
                `).get(dispatchId)) as any;

                if (pendingOrders.count === 0) {
                    (await db.prepare(`
                        UPDATE dispatch_batches 
                        SET status = 'delivered' 
                        WHERE id = ? AND business_id = ?
                    `).run(dispatchId, businessId));
                }
            }

            db.exec('COMMIT');
            return NextResponse.json({ success: true });
        } catch (txnError) {
            db.exec('ROLLBACK');
            throw txnError;
        }
    } catch (error: any) {
        console.error('Dispatch PATCH Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
