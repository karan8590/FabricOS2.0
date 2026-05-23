import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const db = getDatabase();

        const dispatches = (await db.prepare(`
            SELECT 
                db.*,
                (SELECT COUNT(*) FROM dispatch_orders WHERE dispatch_id = db.id) as total_orders,
                (SELECT SUM(o.quantity_meters) 
                 FROM dispatch_orders do 
                 JOIN orders o ON do.order_id = o.id 
                 WHERE do.dispatch_id = db.id) as total_meters,
                 (SELECT COUNT(*) FROM dispatch_orders WHERE dispatch_id = db.id AND delivery_status = 'delivered') as delivered_orders
            FROM dispatch_batches db
            WHERE db.business_id = ?
            ORDER BY db.created_at DESC
        `).all(businessId));

        return NextResponse.json(dispatches);
    } catch (error: any) {
        console.error('Dispatch GET Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        const { vehicleNumber, driverName, driverPhone, route, dispatchDate, notes, orderIds } = body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders selected for dispatch' }, { status: 400 });
        }

        const db = getDatabase();
        db.exec('BEGIN TRANSACTION');

        try {
            // Generate Dispatch Number
            const currentYear = new Date().getFullYear();
            const lastDispatch = (await db.prepare(`
                SELECT dispatch_number FROM dispatch_batches 
                WHERE business_id = ? AND dispatch_number LIKE ? 
                ORDER BY id DESC LIMIT 1
            `).get(businessId, `DSP-${currentYear}-%`)) as any;

            let nextNum = 1;
            if (lastDispatch) {
                const parts = lastDispatch.dispatch_number.split('-');
                if (parts.length === 3) {
                    nextNum = parseInt(parts[2], 10) + 1;
                }
            }
            const dispatchNumber = `DSP-${currentYear}-${nextNum.toString().padStart(4, '0')}`;

            // Create Dispatch Batch
            const result = (await db.prepare(`
                INSERT INTO dispatch_batches (
                    business_id, dispatch_number, vehicle_number, driver_name, driver_phone, route, dispatch_date, notes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'out_for_delivery')
            `).run(businessId, dispatchNumber, vehicleNumber, driverName, driverPhone || null, route || null, dispatchDate, notes || null));

            const dispatchId = result.lastInsertRowid;

            // Assign Orders
            const insertOrder = db.prepare(`
                INSERT INTO dispatch_orders (business_id, dispatch_id, order_id, delivery_status)
                VALUES (?, ?, ?, 'out_for_delivery')
            `);

            const updateOrder = db.prepare(`
                UPDATE orders SET status = 'added_to_dispatch' WHERE id = ? AND business_id = ?
            `);
            
            const logActivity = db.prepare(`
                INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const now = Math.floor(Date.now() / 1000);

            for (const orderId of orderIds) {
                insertOrder.run(businessId, dispatchId, orderId);
                updateOrder.run(orderId, businessId);

                // Fetch customer ID for activity log
                const orderData = (await db.prepare('SELECT customer_id, order_number FROM orders WHERE id = ?').get(orderId)) as any;
                if (orderData) {
                    logActivity.run(
                        businessId, 
                        orderData.customer_id, 
                        'production_workflow', 
                        'Added to Dispatch', 
                        `Order assigned to tempo ${vehicleNumber} (Driver: ${driverName}). Dispatch ID: ${dispatchNumber}.`,
                        JSON.stringify({ order_id: orderId, dispatch_id: dispatchId, action: 'added_to_dispatch' }), 
                        now
                    );
                }
            }

            db.exec('COMMIT');
            return NextResponse.json({ success: true, dispatchId });
        } catch (txnError) {
            db.exec('ROLLBACK');
            throw txnError;
        }

    } catch (error: any) {
        console.error('Dispatch POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
