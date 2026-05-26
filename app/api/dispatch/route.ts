import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { sendTelegramDocument } from '@/lib/telegram';
import { generateChallanPDFServer } from '@/lib/pdf/generateChallanServer';
import { ChallanPDFData } from '@/lib/pdf/pdf-generator';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        const { vehicleNumber, driverName, driverPhone, route, deliveryCost, dispatchDate, notes, orderIds, transportVendorId } = body;

        if (!orderIds || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders selected' }, { status: 400 });
        }

        const db = getDatabase();
        const response = await db.transaction(async () => {
            const placeholders = orderIds.map(() => '?').join(',');
            const ordersData = await db.prepare(`
                SELECT o.id, o.customer_id, o.order_number, o.quantity_meters, o.fabric_type, o.order_stage, o.embroidery_status, o.printing_status, o.dyeing_status,
                       c.name as customer_name, c.phone as customer_phone, c.state, c.state_code, c.gstin as customer_gstin,
                       d.name as design_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                JOIN designs d ON o.design_id = d.id
                WHERE o.id IN (${placeholders}) AND o.business_id = ?
            `).all(...orderIds, businessId) as any[];

            if (ordersData.length === 0) {
                throw new Error('Orders not found');
            }

            let dispatchType = '';

            for (const order of ordersData) {
                if (order.order_stage === 'embroidery' && order.embroidery_status === 'queued_delivery') {
                    if (dispatchType && dispatchType !== 'embroidery') throw new Error('Cannot mix dispatch types');
                    dispatchType = 'embroidery';
                } else if (order.order_stage === 'dyeing' && order.dyeing_status === 'queued_delivery') {
                    if (dispatchType && dispatchType !== 'dyeing') throw new Error('Cannot mix dispatch types');
                    dispatchType = 'dyeing';
                } else if (order.order_stage === 'ready') {
                    if (dispatchType && dispatchType !== 'ready') throw new Error('Cannot mix dispatch types');
                    dispatchType = 'ready';
                } else {
                    throw new Error(`Order #${order.order_number || order.id} is in stage '${order.order_stage}' (Emb: ${order.embroidery_status}, Dye: ${order.dyeing_status}). Not eligible for delivery.`);
                }
            }

            const currentYear = new Date().getFullYear();
            const dispatchNumber = `DSP-${currentYear}-${crypto.randomUUID().slice(0, 8)}`;

            // Create Dispatch Batch
            const result = (await db.prepare(`
                INSERT INTO dispatch_batches (
                    business_id, dispatch_number, vehicle_number, driver_name, driver_phone, route, dispatch_date, delivery_cost, notes, status, transport_vendor_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'out_for_delivery', ?)
            `).run(businessId, dispatchNumber, vehicleNumber, driverName, driverPhone || null, route || null, dispatchDate, deliveryCost === null || deliveryCost === undefined || deliveryCost === '' ? null : deliveryCost, notes || null, transportVendorId || null));

            const dispatchId = result.lastInsertRowid;
            const now = Math.floor(Date.now() / 1000);

            const insertOrder = db.prepare(`
                INSERT INTO dispatch_orders (business_id, dispatch_id, order_id, delivery_status)
                VALUES (?, ?, ?, 'out_for_delivery')
            `);

            const updateOrder = db.prepare(`
                UPDATE orders SET 
                    order_stage = ?,
                    embroidery_status = ?,
                    dyeing_status = ?
                WHERE id = ? AND business_id = ?
            `);
            
            const logActivity = db.prepare(`
                INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            // Generate single Challan for the entire batch with robust retry
            const cOrderIds = ordersData.map(o => o.id);
            const customerIds = [...new Set(ordersData.map(o => o.customer_id))];

            let challanNumber = '';
            let challanInserted = false;
            let attempts = 0;
            let challanId = null;

            while (!challanInserted && attempts < 5) {
                const dateStr = new Date().toISOString().split('T')[0];
                const shortId = Math.random().toString(36).substring(2, 7).toUpperCase();
                challanNumber = `CH-${dateStr}-${shortId}`;
                
                try {
                    const challanResult = (await db.prepare(`
                        INSERT INTO dispatch_challans (business_id, challan_number, dispatch_id, customer_id, order_ids, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(businessId, challanNumber, dispatchId, customerIds[0], JSON.stringify(cOrderIds), now));
                    
                    challanId = challanResult.lastInsertRowid;
                    challanInserted = true;
                } catch (err: any) {
                    if (err.message && err.message.includes('UNIQUE constraint failed')) {
                        attempts++;
                    } else {
                        throw err;
                    }
                }
            }

            if (!challanInserted) {
                throw new Error("Unable to generate unique dispatch challan. Please try again.");
            }

            for (const order of ordersData) {
                insertOrder.run(businessId, dispatchId, order.id);

                let nextOrderStage = order.order_stage;
                let nextEmbroideryStatus = order.embroidery_status;
                let nextDyeingStatus = order.dyeing_status;

                if (dispatchType === 'embroidery') {
                    nextEmbroideryStatus = 'in_progress';
                } else if (dispatchType === 'dyeing') {
                    nextDyeingStatus = 'in_progress';
                } else if (dispatchType === 'ready') {
                    nextOrderStage = 'out_for_delivery';
                }

                updateOrder.run(nextOrderStage, nextEmbroideryStatus, nextDyeingStatus, order.id, businessId);

                logActivity.run(
                    businessId, 
                    order.customer_id, 
                    'production_workflow', 
                    'Dispatched', 
                    `Assigned to tempo ${vehicleNumber} (Driver: ${driverName}). Dispatch ID: ${dispatchNumber}. Challan: ${challanNumber}`,
                    JSON.stringify({ order_ids: [order.id], dispatch_id: dispatchId, challan_id: challanId, action: 'added_to_dispatch' }), 
                    now
                );
            }

            // Create transport vendor payable
            if (transportVendorId) {
                const transportVendor = (await db.prepare('SELECT name, contact FROM vendors WHERE id = ?').get(transportVendorId)) as any;
                
                const cost = deliveryCost !== null && deliveryCost !== undefined && deliveryCost !== '' ? parseFloat(deliveryCost) : null;
                const paymentStatus = 'unpaid';
                const finalCost = cost === null ? 0 : cost;

                await db.prepare(`
                    INSERT INTO vendor_payments (
                        business_id, vendor_id, vendor_name, vendor_phone, order_id, order_number,
                        work_type, total_amount, amount_paid, balance, due_date, status, notes
                    ) VALUES (?, ?, ?, ?, NULL, NULL, 'transport', ?, 0, ?, ?, ?, ?)
                `).run(
                    businessId, transportVendorId, transportVendor?.name || 'Unknown Transport', transportVendor?.contact || '', 
                    finalCost, finalCost, 
                    new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0], 
                    paymentStatus,
                    `Delivery charges for ${orderIds.length} orders (Dispatch ${dispatchNumber})`
                );

                if (finalCost > 0) {
                    await db.prepare(`
                        UPDATE vendors
                        SET balance = balance + ?
                        WHERE id = ? AND business_id = ?
                    `).run(finalCost, transportVendorId, businessId);
                }
            }

            return { dispatchId, businessId, ordersData, dispatchDate, dispatchNumber, challanNumber, vehicleNumber, driverName, driverPhone, route, notes, challanId };
        })();
        
        try {
            const db = getDatabase();
            const business = (await db.prepare(`
                SELECT name, phone, gst_number as gstin, address, logo_url
                FROM businesses
                WHERE id = ?
            `).get(response.businessId)) as any;

            const totalQty = response.ordersData.reduce((sum: any, o: any) => sum + Number(o.quantity_meters), 0);
            const uniqueCustomerNames = [...new Set(response.ordersData.map((o: any) => o.customer_name))];
            
            const pdfData: ChallanPDFData = {
                challan_number: response.challanNumber,
                dispatch_number: response.dispatchNumber,
                dispatch_date: new Date(response.dispatchDate).getTime() / 1000,
                customer_name: uniqueCustomerNames.join(', '),
                customer_phone: response.ordersData[0].customer_phone,
                customer_gstin: response.ordersData[0].customer_gstin,
                driver_name: response.driverName || response.vehicleNumber,
                vehicle_number: response.vehicleNumber,
                driver_phone: response.driverPhone,
                route: response.route,
                orders: response.ordersData.map((o: any) => ({
                    order_number: o.order_number,
                    design_name: o.design_name,
                    fabric_type: o.fabric_type,
                    quantity: Number(o.quantity_meters)
                })),
                total_quantity: totalQty,
                notes: response.notes,
                seller_name: business?.name,
                seller_phone: business?.phone,
                seller_gstin: business?.gstin,
                seller_address: business?.address,
                seller_logo: business?.logo_url
            };
            
            const { buffer } = await generateChallanPDFServer(pdfData);
            
            const telegramText = `📦 *Dispatch Created*\n\n` +
                `*Challan:* ${response.challanNumber}\n` +
                `*Orders:* ${response.ordersData.length}\n` +
                `*Fabric:* ${totalQty.toFixed(2)}m\n\n` +
                `*Customers:*\n- ${uniqueCustomerNames.join('\n- ')}\n\n` +
                `*Vehicle:* ${response.vehicleNumber}\n` +
                `*Driver:* ${response.driverName || 'N/A'}`;
                
            const telegramSent = await sendTelegramDocument(
                buffer, 
                `${response.challanNumber}.pdf`, 
                { english: telegramText, gujarati: telegramText },
                'instant_order_alerts'
            );
            
            if (telegramSent) {
                await db.prepare('UPDATE dispatch_challans SET telegram_sent = 1 WHERE id = ?').run(response.challanId);
            }
        } catch(e) {
            console.error('Failed to send challan to telegram', e);
        }

        return NextResponse.json({ success: true, dispatchId: response.dispatchId });

    } catch (error: any) {
        console.error('Dispatch POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
