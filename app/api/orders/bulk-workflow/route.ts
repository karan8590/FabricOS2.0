import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function POST(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        const { orderIds, action, vendorId, rate, expectedReturnDate, paymentDueDate, notes, generateChallan } = body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
        }

        const db = getDatabase();
        
        await db.prepare('BEGIN').run();

        try {
            if (action === 'send_to_embroidery' || action === 'send_to_dyeing' || action === 'send_to_printing') {
                const type = action === 'send_to_embroidery' ? 'embroidery' : (action === 'send_to_printing' ? 'printing' : 'dyeing');
                
                // 1. Create a combined challan if requested
                let challanId = null;
                if (generateChallan && vendorId) {
                    const currentYear = new Date().getFullYear();
                    const prefix = `VC-${currentYear}-`;
                    const lastChallan = (await db.prepare(`SELECT challan_number FROM challans WHERE business_id = ? AND challan_number LIKE ? ORDER BY id DESC LIMIT 1`).get(businessId, `${prefix}%`)) as any;
                    
                    let nextNum = 1;
                    if (lastChallan) {
                        const parts = lastChallan.challan_number.split('-');
                        if (parts.length === 3) nextNum = parseInt(parts[2], 10) + 1;
                    }
                    const challanNumber = `${prefix}${nextNum.toString().padStart(4, '0')}`;
                    
                    const res = await db.prepare(`
                        INSERT INTO challans (business_id, challan_number, vendor_id, type, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(businessId, challanNumber, vendorId, type, Math.floor(Date.now() / 1000));
                    challanId = res.lastInsertRowid;
                }

                const now = Math.floor(Date.now() / 1000);

                // Update ALL selected orders and create vendor_dispatches
                for (const orderId of orderIds) {
                    const order = (await db.prepare('SELECT id, quantity_meters FROM orders WHERE id = ?').get(orderId)) as any;
                    if (!order) continue;

                    // Update order
                    await db.prepare(`
                        UPDATE orders 
                        SET dispatch_status = 'sent',
                            dispatch_stage = ?,
                            queued_for_dispatch = false,
                            embroidery_status = CASE WHEN ? = 'embroidery' THEN 'sent' ELSE embroidery_status END,
                            dyeing_status = CASE WHEN ? = 'dyeing' THEN 'sent' ELSE dyeing_status END,
                            printing_status = CASE WHEN ? = 'printing' THEN 'sent' ELSE printing_status END
                        WHERE id = ? AND business_id = ?
                    `).run(
                        type, type, type, type, orderId, businessId
                    );
                    
                    // Create vendor dispatch link
                    const currentYear = new Date().getFullYear();
                    const vdspPrefix = `VDSP-${currentYear}-`;
                    const lastVdsp = (await db.prepare(`SELECT dispatch_number FROM vendor_dispatches WHERE business_id = ? AND dispatch_number LIKE ? ORDER BY id DESC LIMIT 1`).get(businessId, `${vdspPrefix}%`)) as any;
                    
                    let vdspNextNum = 1;
                    if (lastVdsp) {
                        const parts = lastVdsp.dispatch_number.split('-');
                        if (parts.length === 3) vdspNextNum = parseInt(parts[2], 10) + 1;
                    }
                    const vdspNumber = `${vdspPrefix}${vdspNextNum.toString().padStart(4, '0')}`;
                    
                    const totalCost = (parseFloat(rate || 0) * parseFloat(order.quantity_meters || 0)).toFixed(2);

                    await db.prepare(`
                        INSERT INTO vendor_dispatches (
                            business_id, dispatch_number, order_id, vendor_id, 
                            work_type, rate, quantity, total_cost, 
                            expected_return_date, payment_due_date, notes, 
                            status, challan_id, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                    `).run(
                        businessId, vdspNumber, orderId, vendorId,
                        type, rate || 0, order.quantity_meters || 0, totalCost,
                        expectedReturnDate || null, paymentDueDate || null, notes || null,
                        challanId, now
                    );
                }

                await db.prepare('COMMIT').run();
                return NextResponse.json({ success: true });
            }

            await db.prepare('ROLLBACK').run();
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

        } catch (innerError) {
            await db.prepare('ROLLBACK').run();
            throw innerError;
        }

    } catch (error: any) {
        console.error('Bulk Workflow Error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
