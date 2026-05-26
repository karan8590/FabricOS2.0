import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        const { orderIds, action, vendorId, rate, expectedReturnDate, paymentDueDate, notes, generateChallan } = body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
        }

        const db = getDatabase();
        return await db.transaction(async () => {
            const now = Math.floor(Date.now() / 1000);

            // Fetch orders and validate stages
            const placeholders = orderIds.map(() => '?').join(',');
            const orders = (await db.prepare(`SELECT id, order_stage, embroidery_status, printing_status, dyeing_status, quantity_meters, order_number FROM orders WHERE id IN (${placeholders}) AND business_id = ?`).all(...orderIds, businessId)) as any[];

            for (const order of orders) {
                const orderStage = order.order_stage || 'order_added';
                if (action === 'send_to_embroidery') {
                    if (orderStage !== 'approved') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot transition to embroidery. Expected: approved`);
                } else if (action === 'send_to_dyeing') {
                    if (orderStage !== 'printing' || order.printing_status !== 'in_progress') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot transition to dyeing. Expected: printing`);
                } else {
                    throw new Error(`Unknown bulk action: ${action}`);
                }
            }

            let challanId = null;
            if (generateChallan && vendorId) {
                const currentYear = new Date().getFullYear();
                const prefix = `VC-${currentYear}-`;
                const lastChallan = (await db.prepare(`SELECT challan_number FROM challans WHERE challan_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`)) as any;
                
                let nextNum = 1;
                if (lastChallan && lastChallan.challan_number) {
                    const parts = lastChallan.challan_number.split('-');
                    if (parts.length >= 3) {
                        const lastNum = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(lastNum)) {
                            nextNum = lastNum + 1;
                        }
                    }
                }
                const challanNumber = `${prefix}${nextNum.toString().padStart(4, '0')}`;
                
                const vendor = (await db.prepare('SELECT name, gst_no FROM vendors WHERE id = ? AND business_id = ?').get(vendorId, businessId)) as any;
                const dateStr = new Date().toISOString().split('T')[0];
                
                const res = await db.prepare(`
                    INSERT INTO challans (business_id, challan_number, challan_type, date, to_name, to_gstin, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'open')
                `).run(businessId, challanNumber, 'jobwork', dateStr, vendor ? vendor.name : 'Vendor', vendor ? vendor.gst_no : '');
                challanId = res.lastInsertRowid;
            }

            for (const order of orders) {
                const reqMetres = Number(order.quantity_meters || 0);
                const currentStage = order.order_stage || 'order_added';
                
                let nextOrderStage = currentStage;
                let nextEmbroideryStatus = order.embroidery_status;
                let nextPrintingStatus = order.printing_status;
                let nextDyeingStatus = order.dyeing_status;

                if (action === 'send_to_embroidery') {
                    nextOrderStage = 'embroidery';
                    nextEmbroideryStatus = 'queued_delivery';
                } else if (action === 'send_to_dyeing') {
                    nextOrderStage = 'dyeing';
                    nextPrintingStatus = 'completed';
                    nextDyeingStatus = 'queued_delivery';
                }

                // Update order stage
                await db.prepare(`
                    UPDATE orders 
                    SET order_stage = ?, embroidery_status = ?, printing_status = ?, dyeing_status = ?
                    WHERE id = ? AND business_id = ?
                `).run(nextOrderStage, nextEmbroideryStatus, nextPrintingStatus, nextDyeingStatus, order.id, businessId);

                // Log stage history
                await db.prepare(`
                    INSERT INTO order_stage_history (business_id, order_id, from_stage, to_stage, changed_by)
                    VALUES (?, ?, ?, ?, ?)
                `).run(businessId, order.id, currentStage, nextOrderStage, user?.id || null);

                // Create vendor dispatch
                const currentYear = new Date().getFullYear();
                const vdspPrefix = `VDSP-${currentYear}-`;
                const lastVdsp = (await db.prepare(`SELECT dispatch_number FROM vendor_dispatches WHERE dispatch_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${vdspPrefix}%`)) as any;
                
                let vdspNextNum = 1;
                if (lastVdsp && lastVdsp.dispatch_number) {
                    const parts = lastVdsp.dispatch_number.split('-');
                    if (parts.length >= 3) {
                        const lastNum = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(lastNum)) {
                            vdspNextNum = lastNum + 1;
                        }
                    }
                }
                const vdspNumber = `${vdspPrefix}${vdspNextNum.toString().padStart(4, '0')}`;
                
                const processType = action === 'send_to_embroidery' ? 'embroidery' : 'dyeing';
                const totalCost = (parseFloat(rate || 0) * reqMetres).toFixed(2);

                await db.prepare(`
                    INSERT INTO vendor_dispatches (
                        business_id, dispatch_number, order_id, vendor_id, 
                        process_type, rate_per_meter, total_meters, total_cost, 
                        expected_return_date, notes, 
                        status, sent_date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)
                `).run(
                    businessId, vdspNumber, order.id, vendorId,
                    processType, rate || 0, reqMetres, totalCost,
                    expectedReturnDate ? Math.floor(new Date(expectedReturnDate).getTime() / 1000) : null, notes || null,
                    now, now
                );
                
                // Update vendor balance & payable
                await db.prepare(`UPDATE vendors SET balance = balance + ? WHERE id = ? AND business_id = ?`).run(parseFloat(totalCost), vendorId, businessId);

                const vendorInfo = (await db.prepare('SELECT name, contact FROM vendors WHERE id = ?').get(vendorId)) as any;
                await db.prepare(`
                    INSERT INTO vendor_payments (
                        business_id, vendor_id, vendor_name, vendor_phone, order_id, order_number,
                        work_type, total_amount, amount_paid, balance, due_date, status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'unpaid', ?)
                `).run(
                    businessId, vendorId, vendorInfo?.name || 'Unknown', vendorInfo?.phone || vendorInfo?.contact || '', 
                    order.id, order.order_number || order.id.toString(),
                    processType, parseFloat(totalCost), parseFloat(totalCost), 
                    paymentDueDate ? new Date(paymentDueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], 
                    notes || null
                );
            }

            return NextResponse.json({ success: true });

        })();

    } catch (error: any) {
        console.error('Bulk Workflow Error:', error);
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}
