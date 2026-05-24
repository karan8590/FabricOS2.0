import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { logAction } from '@/lib/auditLogger';
import { calculateOrderFinancials } from '@/lib/financialEngine';

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
        
        // Fetch Order with Design and Customer details
        const order = (await db.prepare(`
            SELECT 
                o.*, 
                c.name as customer_name, 
                c.phone as customer_phone,
                c.total_orders as customer_lifetime_orders,
                c.outstanding_amount as customer_balance,
                d.name as design_name,
                d.image_url as design_image,
                d.price_per_meter as rate_per_meter,
                d.category as design_category
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.id = ? AND o.business_id = ?
        `).get(params.id, businessId)) as any;

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        // Fetch Invoices for this order
        const invoices = (await db.prepare(`
            SELECT * FROM invoices WHERE order_id = ?
        `).all(params.id)) as any[];

        // Calculate Payment stats
        let totalAmount = 0;
        let paidAmount = 0;
        let pendingAmount = 0;
        
        if (invoices.length > 0) {
            totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
            paidAmount = invoices.reduce((sum, inv) => sum + (inv.amount_paid || (inv.status === 'paid' ? inv.amount : 0)), 0);
            pendingAmount = totalAmount - paidAmount;
        } else {
            const financials = calculateOrderFinancials(order);
            totalAmount = financials.finalTotal;
            pendingAmount = totalAmount;
        }

        // Fetch Activity Logs
        const activities = (await db.prepare(`
            SELECT * FROM audit_logs 
            WHERE entity = 'order' AND entity_id = ?
            ORDER BY created_at DESC
        `).all(params.id.toString())).map((log: any) => ({
            id: log.id,
            title: log.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            description: `Order ${log.action.replace(/_/g, ' ')} by ${log.user_name}`,
            created_at: log.created_at,
            meta: log.changes
        }));

        // Fetch all job costs for this order
        const jobCosts = (await db.prepare(`
            SELECT jc.*, v.name AS vendor_name 
            FROM order_job_costs jc
            JOIN vendors v ON jc.vendor_id = v.id
            WHERE jc.order_id = ?
            ORDER BY jc.created_at DESC
        `).all(params.id)) as any[];

        // Calculate linked fabric purchase costs from inventory_fabric
        const orderNum = order.order_number || '';
        const fabricCostRow = (await db.prepare(`
            SELECT SUM(purchase_cost) AS val 
            FROM inventory_fabric 
            WHERE linked_order_no = ? OR linked_order_no = ?
        `).get(orderNum, `#${orderNum}`)) as any;
        const fabricPurchaseCost = fabricCostRow?.val || 0;

        return NextResponse.json({
            ...order,
            invoices,
            payment: {
                total: totalAmount,
                paid: paidAmount,
                pending: pendingAmount,
                progress: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
            },
            activities,
            jobCosts,
            fabricPurchaseCost
        });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.delete');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const db = getDatabase();
        
        // Check if order has invoices
        const invoices = (await db.prepare('SELECT id FROM invoices WHERE order_id = ?').all(params.id));
        if (invoices.length > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete order with existing invoices. Delete invoices first.' 
            }, { status: 400 });
        }

        (await db.prepare('DELETE FROM orders WHERE id = ? AND business_id = ?').run(params.id, businessId));

        // Audit log: deletion
        await logAction({
            action: 'delete',
            entity: 'order',
            entityId: params.id,
            entityLabel: `Order #${params.id}`,
            businessId
        });
        
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
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
        const { 
            quantity_meters, delivery_date, order_date,
            base_amount, printing_cost, embroidery_cost_charged, dyeing_cost_charged,
            additional_charges, discount, gst_rate, gst_amount
        } = body;
        
        const db = getDatabase();
        
        // Fetch current order to get design_id for price recalculation if quantity changed
        const currentOrder = (await db.prepare('SELECT * FROM orders WHERE id = ?').get(params.id)) as any;
        if (!currentOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const design = (await db.prepare('SELECT price_per_meter FROM designs WHERE id = ?').get(currentOrder.design_id)) as any;
        const newQuantity = quantity_meters !== undefined ? quantity_meters : currentOrder.quantity_meters;
        
        const financials = calculateOrderFinancials({
            ...currentOrder,
            quantity_meters: newQuantity,
            price_per_unit: currentOrder.price_per_unit || design?.price_per_meter,
            base_amount: base_amount !== undefined ? base_amount : currentOrder.base_amount,
            printing_cost: printing_cost !== undefined ? printing_cost : currentOrder.printing_cost,
            embroidery_cost_charged: embroidery_cost_charged !== undefined ? embroidery_cost_charged : currentOrder.embroidery_cost_charged,
            dyeing_cost_charged: dyeing_cost_charged !== undefined ? dyeing_cost_charged : currentOrder.dyeing_cost_charged,
            additional_charges: additional_charges !== undefined ? additional_charges : currentOrder.additional_charges,
            discount: discount !== undefined ? discount : currentOrder.discount,
            gst_rate: gst_rate !== undefined ? gst_rate : currentOrder.gst_rate,
            gst_amount: gst_amount !== undefined ? gst_amount : currentOrder.gst_amount
        });

        const total_price = financials.finalTotal;

        console.log('[DEBUG] Order edit financials:', {
            payloadTotal: base_amount !== undefined ? base_amount : currentOrder.base_amount,
            calculatedTotal: total_price,
            dbSavedTotal: total_price
        });

        (await db.prepare(`
            UPDATE orders 
            SET 
                quantity_meters = COALESCE(?, quantity_meters),
                delivery_date = COALESCE(?, delivery_date),
                order_date = COALESCE(?, order_date),
                total_price = ?,
                base_amount = ?,
                printing_cost = ?,
                embroidery_cost_charged = ?,
                dyeing_cost_charged = ?,
                additional_charges = ?,
                discount = ?,
                gst_rate = ?,
                gst_amount = ?
            WHERE id = ? AND business_id = ?
        `).run(
            quantity_meters, delivery_date, order_date, 
            total_price, financials.baseAmount, financials.printingCost, 
            financials.embroideryCostCharged, financials.dyeingCostCharged, 
            financials.additionalCharges, financials.discount, financials.gstRate, financials.gstAmount,
            params.id, businessId
        ));

        // Log Activity
        (await db.prepare(`
            INSERT INTO activity (customer_id, type, title, description, meta)
            SELECT customer_id, 'order_updated', 'Order Updated', 'Order details were updated by admin', ?
            FROM orders WHERE id = ?
        `).run(JSON.stringify({ order_id: params.id, updates: body }), params.id));

        // Audit log: update
        await logAction({
            action: 'update',
            entity: 'order',
            entityId: params.id,
            entityLabel: `Order #${params.id}`,
            changes: body
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Update Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
