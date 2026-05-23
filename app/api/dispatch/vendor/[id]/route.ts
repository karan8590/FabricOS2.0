import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

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

        const vendorDispatch = (await db.prepare(`
            SELECT 
                vd.*,
                v.name as vendor_name, v.contact as vendor_phone, v.address as vendor_address,
                o.order_number, o.quantity_meters, o.status as order_status,
                c.name as customer_name,
                d.name as design_name
            FROM vendor_dispatches vd
            JOIN vendors v ON vd.vendor_id = v.id
            JOIN orders o ON vd.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE vd.id = ? AND vd.business_id = ?
        `).get(dispatchId, businessId));

        if (!vendorDispatch) return NextResponse.json({ error: 'Vendor Dispatch not found' }, { status: 404 });

        return NextResponse.json(vendorDispatch);
    } catch (error: any) {
        console.error('Vendor Dispatch GET Error:', error);
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
        const { action } = body;
        const dispatchId = params.id;

        const db = getDatabase();

        if (action === 'mark_returned') {
            db.exec('BEGIN TRANSACTION');
            try {
                const vendorDispatch = (await db.prepare(`
                    SELECT * FROM vendor_dispatches WHERE id = ? AND business_id = ?
                `).get(dispatchId, businessId)) as any;

                if (!vendorDispatch) throw new Error('Vendor dispatch not found');
                if (vendorDispatch.status === 'returned') throw new Error('Already returned');

                const now = Math.floor(Date.now() / 1000);

                // Update Vendor Dispatch
                (await db.prepare(`
                    UPDATE vendor_dispatches 
                    SET status = 'returned', returned_at = ?
                    WHERE id = ? AND business_id = ?
                `).run(now, dispatchId, businessId));

                // Move order forward in the workflow
                const newOrderStatus = vendorDispatch.process_type === 'embroidery' ? 'printing_in_factory' : 'ready';
                
                (await db.prepare(`
                    UPDATE orders 
                    SET status = ? 
                    WHERE id = ? AND business_id = ?
                `).run(newOrderStatus, vendorDispatch.order_id, businessId));

                // Add activity log
                const orderData = (await db.prepare('SELECT customer_id FROM orders WHERE id = ?').get(vendorDispatch.order_id)) as any;
                
                (await db.prepare(`
                    INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                                    businessId, 
                                    orderData.customer_id, 
                                    'production_workflow', 
                                    `Returned from ${vendorDispatch.process_type === 'embroidery' ? 'Embroidery' : 'Dyeing'}`, 
                                    `Order ${vendorDispatch.process_type} has been completed and returned.`,
                                    JSON.stringify({ order_id: vendorDispatch.order_id, dispatch_id: dispatchId, action: 'returned' }), 
                                    now
                                ));

                db.exec('COMMIT');
                return NextResponse.json({ success: true, newOrderStatus });
            } catch (txnError) {
                db.exec('ROLLBACK');
                throw txnError;
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Vendor Dispatch PATCH Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
