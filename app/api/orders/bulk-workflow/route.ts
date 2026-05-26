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
            const orders = (await db.prepare(`SELECT id, order_stage, embroidery_status, printing_status, dyeing_status, quantity_meters, order_number, customer_id, fabric_type FROM orders WHERE id IN (${placeholders}) AND business_id = ?`).all(...orderIds, businessId)) as any[];

            for (const order of orders) {
                const orderStage = order.order_stage || 'order_added';
                if (action === 'send_to_embroidery') {
                    if (orderStage !== 'approved') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot transition to embroidery. Expected: approved`);
                } else if (action === 'send_to_dyeing') {
                    if (orderStage !== 'printing' || order.printing_status !== 'in_progress') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot transition to dyeing. Expected: printing`);
                } else if (action === 'approve') {
                    if (orderStage !== 'order_added') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot be approved. Expected: order_added`);
                } else if (action === 'mark_printing') {
                    if (orderStage !== 'embroidery' || order.embroidery_status !== 'in_progress') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot be marked printing. Expected: embroidery`);
                } else if (action === 'mark_ready') {
                    if (orderStage !== 'dyeing' || order.dyeing_status !== 'in_progress') throw new Error(`Order #${order.order_number || order.id} is in stage '${orderStage}', cannot be marked ready. Expected: dyeing`);
                } else {
                    throw new Error(`Unknown bulk action: ${action}`);
                }
            }

            if (action === 'mark_printing') {
                for (const order of orders) {
                    const currentStage = order.order_stage || 'order_added';
                    
                    // Update order stages
                    await db.prepare(`
                        UPDATE orders 
                        SET order_stage = 'printing', embroidery_status = 'completed', printing_status = 'in_progress'
                        WHERE id = ? AND business_id = ?
                    `).run(order.id, businessId);

                    // Log stage history
                    await db.prepare(`
                        INSERT INTO order_stage_history (business_id, order_id, from_stage, to_stage, changed_by)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(businessId, order.id, currentStage, 'printing', user?.id || null);

                    // Log activity
                    await db.prepare(`
                        INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                        VALUES (?, ?, 'production_workflow', 'Printing Completed', ?, ?, ?)
                    `).run(
                        businessId, order.customer_id, 
                        `Order moved to printing stage (bulk action).`,
                        JSON.stringify({ order_id: order.id, action: 'mark_printing', from: currentStage, to: 'printing' }), 
                        now
                    );

                    // Telegram
                    try {
                        const { sendTelegramMessage } = await import('@/lib/telegram');
                        const tgMsg = `🔄 *Status Updated (Bulk)*\nOrder #${order.order_number || order.id} (${order.customer_name || 'Customer'})\nMoved to: *Printing Completed*`;
                        sendTelegramMessage({ english: tgMsg, gujarati: tgMsg }, 'instant_order_alerts').catch(() => {});
                    } catch(e) {}
                }
                return NextResponse.json({ success: true });
            }

            if (action === 'mark_ready') {
                for (const order of orders) {
                    const currentStage = order.order_stage || 'order_added';
                    
                    // Update order stages
                    await db.prepare(`
                        UPDATE orders 
                        SET order_stage = 'ready', dyeing_status = 'completed'
                        WHERE id = ? AND business_id = ?
                    `).run(order.id, businessId);

                    // Log stage history
                    await db.prepare(`
                        INSERT INTO order_stage_history (business_id, order_id, from_stage, to_stage, changed_by)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(businessId, order.id, currentStage, 'ready', user?.id || null);

                    // Log activity
                    await db.prepare(`
                        INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                        VALUES (?, ?, 'production_workflow', 'Ready for Delivery', ?, ?, ?)
                    `).run(
                        businessId, order.customer_id, 
                        `Order moved to ready stage (bulk action).`,
                        JSON.stringify({ order_id: order.id, action: 'mark_ready', from: currentStage, to: 'ready' }), 
                        now
                    );

                    // Telegram
                    try {
                        const { sendTelegramMessage } = await import('@/lib/telegram');
                        const tgMsg = `🔄 *Status Updated (Bulk)*\nOrder #${order.order_number || order.id} (${order.customer_name || 'Customer'})\nMoved to: *Ready for Delivery*`;
                        sendTelegramMessage({ english: tgMsg, gujarati: tgMsg }, 'instant_order_alerts').catch(() => {});
                    } catch(e) {}
                }
                return NextResponse.json({ success: true });
            }

            if (action === 'approve') {
                const { computeInventory } = await import('@/lib/inventory');
                
                for (const order of orders) {
                    const currentStage = order.order_stage || 'order_added';
                    const reqMetres = Number(order.quantity_meters || 0);
                    
                    // 1. Reserve fabric stock
                    const fabricType = order.fabric_type || 'Polyester';
                    const availableMaterials = (await db.prepare(`
                        SELECT *
                        FROM inventory_materials 
                        WHERE name = ? AND category = 'Fabric' AND business_id = ? AND COALESCE(is_deleted, false) = false
                        ORDER BY last_purchase_date ASC, id ASC
                    `).all(fabricType, businessId)) as any[];

                    // Fetch history for these materials
                    const matIds = availableMaterials.map(m => m.id);
                    let historyByMat: Record<number, any[]> = {};
                    if (matIds.length > 0) {
                        const mPlaceholders = matIds.map(() => '?').join(',');
                        const hist = (await db.prepare(`SELECT * FROM inventory_history WHERE material_id IN (${mPlaceholders}) AND business_id = ? AND COALESCE(is_deleted, false) = false`).all(...matIds, businessId)) as any[];
                        for (const h of hist) {
                            if (!historyByMat[h.material_id]) historyByMat[h.material_id] = [];
                            historyByMat[h.material_id].push(h);
                        }
                    }
                    
                    for (const m of availableMaterials) {
                        const calc = computeInventory(historyByMat[m.id] || []);
                        m.real_available = calc.available;
                        m.real_reserved = calc.reserved;
                    }

                    const totalAvailable = availableMaterials.reduce((sum, m) => sum + m.real_available, 0);
                    if (totalAvailable < reqMetres) {
                        throw new Error(`Not enough ${fabricType} fabric available for Order #${order.order_number || order.id}. Required: ${reqMetres}m, Available: ${totalAvailable}m`);
                    }

                    let remainingMetersToDeduct = reqMetres;
                    for (const material of availableMaterials) {
                        if (remainingMetersToDeduct <= 0) break;
                        if (material.real_available <= 0) continue;

                        const reservation = Math.min(material.real_available, remainingMetersToDeduct);
                        const newAvailable = material.real_available - reservation;
                        const newReserved = material.real_reserved + reservation;
                        
                        await db.prepare(`
                            UPDATE inventory_materials 
                            SET available_stock = ?, reserved_stock = ?
                            WHERE id = ? AND business_id = ?
                        `).run(newAvailable, newReserved, material.id, businessId);
                        
                        await db.prepare(`
                            INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, linked_order_id, user_id)
                            VALUES (?, ?, 'Reserved', ?, ?, ?, ?, ?, ?)
                        `).run(businessId, material.id, reservation, material.real_available, newAvailable, `Reserved for Order #${order.order_number || order.id}`, order.id, user?.id || 1);

                        remainingMetersToDeduct -= reservation;
                    }

                    // 2. Update order stage, status, approved_at
                    await db.prepare(`
                        UPDATE orders 
                        SET status = 'approved', order_stage = 'approved', approved_at = ?
                        WHERE id = ? AND business_id = ?
                    `).run(now, order.id, businessId);

                    // 3. Log stage history
                    await db.prepare(`
                        INSERT INTO order_stage_history (business_id, order_id, from_stage, to_stage, changed_by)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(businessId, order.id, currentStage, 'approved', user?.id || null);

                    // 4. Log Activity
                    await db.prepare(`
                        INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                        VALUES (?, ?, 'production_workflow', 'Order Approved', ?, ?, ?)
                    `).run(
                        businessId, order.customer_id, 
                        `Order approved and moved to production (bulk action).`,
                        JSON.stringify({ order_id: order.id, action: 'approve', from: currentStage, to: 'approved' }), 
                        now
                    );

                    // 5. Telegram alert
                    try {
                        const orderInfo = (await db.prepare(`
                            SELECT o.order_number, o.total_price, o.quantity_meters, c.name as customer_name, d.name as design_name
                            FROM orders o
                            JOIN customers c ON o.customer_id = c.id
                            JOIN designs d ON o.design_id = d.id
                            WHERE o.id = ?
                        `).get(order.id)) as any;

                        if (orderInfo) {
                            const { buildOrderAlertTemplate } = await import('@/lib/telegram-templates');
                            const { sendTelegramMessage } = await import('@/lib/telegram');
                            
                            const payloadText = buildOrderAlertTemplate({
                                statusLabel: { en: '✅ Order Approved (Bulk)', guj: '✅ ઓર્ડર મંજૂર (બલ્ક)' },
                                orderNo: orderInfo.order_number,
                                customerName: orderInfo.customer_name,
                                designName: orderInfo.design_name,
                                quantity: orderInfo.quantity_meters,
                                value: orderInfo.total_price
                            });
                            sendTelegramMessage(payloadText, 'instant_order_alerts').catch(() => {});
                        }
                    } catch (e) {}
                }

                return NextResponse.json({ success: true });
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
