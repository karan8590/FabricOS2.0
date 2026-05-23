import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildOrderAlertTemplate } from '@/lib/telegram-templates';
import { ORDER_STATUSES } from '@/lib/constants';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        const { action, vendorId, rate, metres, expectedReturnDate, notes, metresReceived, qualityResult, transporterName, lrNumber, dispatchDate, metresDispatched, expectedDelivery, dateDelivered, deliveredTo } = body;
        const orderId = parseInt(params.id);

        const db = getDatabase();

        const order = (await db.prepare(`
            SELECT o.*, c.name as customer_name, d.name as design_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.id = ? AND o.business_id = ?
        `).get(orderId, businessId)) as any;

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        let newStatus = order.status;
        let activityTitle = '';
        let activityDescription = '';
        const todayDate = new Date().toISOString().split('T')[0];

        await db.exec('BEGIN TRANSACTION');

        try {
            if (action === 'approve') {
                newStatus = ORDER_STATUSES.APPROVED;
                activityTitle = 'Order Approved';
                activityDescription = `Order approved for production.`;
            }
            else if (action === 'send_to_embroidery' || action === 'send_to_dyeing') {
                const workType = action === 'send_to_embroidery' ? 'embroidery' : 'dyeing';
                newStatus = action === 'send_to_embroidery' ? ORDER_STATUSES.EMBROIDERY : ORDER_STATUSES.DYEING;
                
                const vendor = (await db.prepare('SELECT name, contact FROM vendors WHERE id = ?').get(vendorId)) as any;
                if (!vendor) throw new Error('Vendor not found');

                const totalCost = (parseFloat(rate || 0) * parseFloat(metres || 0)).toFixed(2);
                
                // Generate Vendor Dispatch ID
                const currentYear = new Date().getFullYear();
                const vdspPrefix = `VDSP-${currentYear}-`;
                const lastVdsp = (await db.prepare(`
                    SELECT dispatch_number FROM vendor_dispatches 
                    WHERE business_id = ? AND dispatch_number LIKE ? 
                    ORDER BY id DESC LIMIT 1
                `).get(businessId, `${vdspPrefix}%`)) as any;

                let nextVdspNum = 1;
                if (lastVdsp && lastVdsp.dispatch_number) {
                    const parts = lastVdsp.dispatch_number.split('-');
                    if (parts.length === 3) {
                        nextVdspNum = parseInt(parts[2], 10) + 1;
                    }
                }
                const newDispatchNumber = `${vdspPrefix}${nextVdspNum.toString().padStart(4, '0')}`;

                const insertJobCost = (await db.prepare(`
                    INSERT INTO order_job_costs (
                        business_id, order_id, type, vendor_id, metres, rate_per_metre, 
                        total_cost, date, payment_mode, status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)
                `).run(
                                    businessId, orderId, workType, vendorId, parseFloat(metres), parseFloat(rate),
                                    parseFloat(totalCost), todayDate, 'Unpaid', notes || null
                                ));

                (await db.prepare(`
                    INSERT INTO vendor_payments (
                        business_id, vendor_id, vendor_name, vendor_phone, order_id, order_number,
                        work_type, total_amount, amount_paid, balance, due_date, status, notes, linked_job_cost_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'unpaid', ?, ?)
                `).run(
                                    businessId, vendorId, vendor.name, vendor.contact, orderId, order.order_number,
                                    workType, parseFloat(totalCost), parseFloat(totalCost), expectedReturnDate || todayDate, notes || null, insertJobCost.lastInsertRowid
                                ));

                const expReturnDateTs = expectedReturnDate ? new Date(expectedReturnDate).getTime() : null;
                (await db.prepare(`
                    INSERT INTO vendor_dispatches (
                        business_id, dispatch_number, order_id, vendor_id, process_type, 
                        sent_date, expected_return_date, rate_per_meter, total_meters, total_cost, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
                `).run(
                                    businessId, newDispatchNumber, orderId, vendorId, workType, 
                                    Date.now(), expReturnDateTs, parseFloat(rate), parseFloat(metres), parseFloat(totalCost)
                                ));

                (await db.prepare('UPDATE vendors SET balance = balance + ? WHERE id = ?').run(parseFloat(totalCost), vendorId));

                const columnToUpdate = workType === 'embroidery' ? 'embroidery_job_cost' : 'dyeing_job_cost';
                (await db.prepare(`UPDATE orders SET ${columnToUpdate} = COALESCE(${columnToUpdate}, 0) + ? WHERE id = ?`).run(parseFloat(totalCost), orderId));

                activityTitle = `Sent to ${workType === 'embroidery' ? 'Embroidery' : 'Dyeing'}`;
                activityDescription = `Sent ${metres}m to ${vendor.name} at ₹${rate}/m = ₹${totalCost}.`;
            } 
            else if (action === 'mark_printing') {
                newStatus = ORDER_STATUSES.PRINTING;
                activityTitle = 'Embroidery Received - Printing Started';
                activityDescription = `Received ${metresReceived}m back. Quality: ${qualityResult}. ${notes || ''}`;
                
                (await db.prepare(`UPDATE vendor_dispatches SET status = 'returned', returned_at = ? WHERE order_id = ? AND process_type = 'embroidery' AND status = 'sent'`).run(Date.now(), orderId));
            } 
            else if (action === 'mark_ready') {
                if (body.reworkNeeded) {
                    activityTitle = 'Dyeing Quality Failed - Rework Needed';
                    activityDescription = `Received ${metresReceived}m back. Quality: ${qualityResult}. Rework required. ${notes || ''}`;
                } else {
                    newStatus = ORDER_STATUSES.READY;
                    activityTitle = 'Dyeing Received - Ready for Dispatch';
                    activityDescription = `Received ${metresReceived}m back. Quality: ${qualityResult}. ${notes || ''}`;
                }
                (await db.prepare(`UPDATE vendor_dispatches SET status = 'returned', returned_at = ? WHERE order_id = ? AND process_type = 'dyeing' AND status = 'sent'`).run(Date.now(), orderId));
            } 
            else if (action === 'dispatch') {
                newStatus = ORDER_STATUSES.DISPATCHED;
                activityTitle = 'Order Dispatched';
                activityDescription = `Dispatched ${metresDispatched}m via ${transporterName} (LR: ${lrNumber}). Expected delivery: ${expectedDelivery}.`;
            }
            else if (action === 'mark_delivered') {
                newStatus = ORDER_STATUSES.DELIVERED;
                activityTitle = 'Order Delivered';
                activityDescription = `Delivered to ${deliveredTo || 'Customer'} on ${dateDelivered}. ${notes || ''}`;
            }
            else {
                throw new Error('Invalid action');
            }

            (await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, orderId));

            (await db.prepare(`
                INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                            businessId, order.customer_id, 'production_workflow', activityTitle, activityDescription,
                            JSON.stringify({ order_id: orderId, action, status: newStatus }), Math.floor(Date.now() / 1000)
                        ));
            await db.exec('COMMIT');

        } catch (txnError) {
            await db.exec('ROLLBACK');
            throw txnError;
        }

        // Trigger Telegram Alerts
        try {
            const tgTemplates: Record<string, { english: string; gujarati: string }> = {
                approve: { english: `✅ Order Approved — ${order.customer_name} ${order.quantity_meters}m ${order.design_name}`, gujarati: `✅ ઓર્ડર મંજૂર — ${order.customer_name} ${order.quantity_meters}m ${order.design_name}` },
                send_to_embroidery: { english: `🪡 #${order.order_number || order.id} → Embroidery — ${metres}m back by ${expectedReturnDate}`, gujarati: `🪡 #${order.order_number || order.id} → ભરતકામ — ${metres}m ${expectedReturnDate} સુધીમાં પરત` },
                mark_printing: { english: `🖨️ #${order.order_number || order.id} → Printing started — embroidery done`, gujarati: `🖨️ #${order.order_number || order.id} → પ્રિન્ટિંગ શરૂ — ભરતકામ પૂર્ણ` },
                send_to_dyeing: { english: `🎨 #${order.order_number || order.id} → Dyeing — ${metres}m back by ${expectedReturnDate}`, gujarati: `🎨 #${order.order_number || order.id} → ડાઇંગ — ${metres}m ${expectedReturnDate} સુધીમાં પરત` },
                mark_ready: { english: `✅ #${order.order_number || order.id} Ready for dispatch — ${order.customer_name} ${order.quantity_meters}m`, gujarati: `✅ #${order.order_number || order.id} ડિલિવરી માટે તૈયાર — ${order.customer_name} ${order.quantity_meters}m` },
                dispatch: { english: `🚚 #${order.order_number || order.id} Dispatched — ${order.customer_name} LR:${lrNumber} via ${transporterName}`, gujarati: `🚚 #${order.order_number || order.id} મોકલવામાં આવ્યો — ${order.customer_name} LR:${lrNumber} મારફતે ${transporterName}` },
                mark_delivered: { english: `📦 #${order.order_number || order.id} Delivered — ${order.customer_name} ${dateDelivered}`, gujarati: `📦 #${order.order_number || order.id} ડિલિવર થયું — ${order.customer_name} ${dateDelivered}` },
            };
            
            if (tgTemplates[action]) {
                sendTelegramMessage(tgTemplates[action], 'instant_order_alerts').catch(console.error);
            }
        } catch (tgErr) {
            console.error('[Telegram ERROR]', tgErr);
        }

        return NextResponse.json({ success: true, newStatus });
    } catch (error: any) {
        console.error('Workflow Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
