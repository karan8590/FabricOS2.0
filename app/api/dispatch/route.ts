import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { generateChallanPDFServer, ChallanPDFData } from '@/lib/pdf/generateChallanServer';
import { sendTelegramDocument } from '@/lib/telegram';

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

        // Fetch challans for these dispatches
        if (dispatches.length > 0) {
            const dispatchIds = dispatches.map((d: any) => d.id);
            const placeholders = dispatchIds.map(() => '?').join(',');
            const challans = (await db.prepare(`
                SELECT c.id, c.dispatch_id, c.challan_number, c.customer_id, c.telegram_sent, cust.name as customer_name
                FROM dispatch_challans c
                JOIN customers cust ON c.customer_id = cust.id
                WHERE c.dispatch_id IN (${placeholders})
            `).all(...dispatchIds)) as any[];

            const challansByDispatch: Record<number, any[]> = {};
            challans.forEach(c => {
                if (!challansByDispatch[c.dispatch_id]) {
                    challansByDispatch[c.dispatch_id] = [];
                }
                challansByDispatch[c.dispatch_id].push(c);
            });

            dispatches.forEach((d: any) => {
                d.challans = challansByDispatch[d.id] || [];
            });
        }

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
        const { vehicleNumber, driverName, driverPhone, route, dispatchDate, notes, orderIds, transportVendorId } = body;

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
                    business_id, dispatch_number, vehicle_number, driver_name, driver_phone, route, dispatch_date, notes, status, transport_vendor_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'out_for_delivery', ?)
            `).run(businessId, dispatchNumber, vehicleNumber, driverName, driverPhone || null, route || null, dispatchDate, notes || null, transportVendorId || null));

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

            // Fetch order details for grouping by customer
            const placeholders = orderIds.map(() => '?').join(',');
            const ordersData = await db.prepare(`
                SELECT o.id, o.customer_id, o.order_number, o.quantity_meters, o.fabric_type, 
                       c.name as customer_name, c.phone as customer_phone, c.state, c.state_code, c.gstin as customer_gstin,
                       d.name as design_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                JOIN designs d ON o.design_id = d.id
                WHERE o.id IN (${placeholders}) AND o.business_id = ?
            `).all(...orderIds, businessId) as any[];

            const ordersByCustomer: Record<number, any[]> = {};
            for (const order of ordersData) {
                if (!ordersByCustomer[order.customer_id]) {
                    ordersByCustomer[order.customer_id] = [];
                }
                ordersByCustomer[order.customer_id].push(order);
            }

            const createdChallans: Array<{ id: number; customerId: number; challanNumber: string; orders: any[] }> = [];

            for (const orderId of orderIds) {
                insertOrder.run(businessId, dispatchId, orderId);
                updateOrder.run(orderId, businessId);
            }

            // Generate Challans per customer
            const insertChallan = db.prepare(`
                INSERT INTO dispatch_challans (business_id, challan_number, dispatch_id, customer_id, order_ids, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const customerIdStr of Object.keys(ordersByCustomer)) {
                const customerId = parseInt(customerIdStr, 10);
                const custOrders = ordersByCustomer[customerId];
                
                // Generate Challan Number
                const currentYear = new Date().getFullYear();
                const lastChallan = (await db.prepare(`
                    SELECT challan_number FROM dispatch_challans 
                    WHERE business_id = ? AND challan_number LIKE ? 
                    ORDER BY id DESC LIMIT 1
                `).get(businessId, `DC-${currentYear}-%`)) as any;

                let nextNum = 1;
                if (lastChallan) {
                    const parts = lastChallan.challan_number.split('-');
                    if (parts.length === 3) {
                        nextNum = parseInt(parts[2], 10) + 1;
                    }
                }
                const challanNumber = `DC-${currentYear}-${nextNum.toString().padStart(5, '0')}`;
                
                const cOrderIds = custOrders.map(o => o.id);
                
                const challanResult = insertChallan.run(businessId, challanNumber, dispatchId, customerId, JSON.stringify(cOrderIds), now);
                createdChallans.push({
                    id: challanResult.lastInsertRowid,
                    customerId,
                    challanNumber,
                    orders: custOrders
                });
                
                logActivity.run(
                    businessId, 
                    customerId, 
                    'production_workflow', 
                    'Added to Dispatch', 
                    `Orders assigned to tempo ${vehicleNumber} (Driver: ${driverName}). Dispatch ID: ${dispatchNumber}. Challan: ${challanNumber}`,
                    JSON.stringify({ order_ids: cOrderIds, dispatch_id: dispatchId, challan_id: challanResult.lastInsertRowid, action: 'added_to_dispatch' }), 
                    now
                );
            }

            db.exec('COMMIT');
            
            // Post-commit: Generate PDF and Send Telegram
            // We do not await this to block the response, but Next.js serverless might kill it if not awaited.
            // Since it's quick enough, we'll await it so UI gets accurate status or we can do it asynchronously.
            // Wait, we need to send it safely.
            const business = (await db.prepare(`
                SELECT name, phone, gst_number as gstin, address, logo_url
                FROM businesses
                WHERE id = ?
            `).get(businessId)) as any;

            const telegramTasks = createdChallans.map(async (challan) => {
                try {
                    const firstOrder = challan.orders[0];
                    const totalQty = challan.orders.reduce((sum, o) => sum + Number(o.quantity_meters), 0);
                    
                    const pdfData: ChallanPDFData = {
                        challan_number: challan.challanNumber,
                        dispatch_number: dispatchNumber,
                        dispatch_date: new Date(dispatchDate).getTime() / 1000,
                        customer_name: firstOrder.customer_name,
                        customer_phone: firstOrder.customer_phone,
                        customer_gstin: firstOrder.customer_gstin,
                        driver_name: driverName || vehicleNumber,
                        vehicle_number: vehicleNumber,
                        driver_phone: driverPhone,
                        route: route,
                        orders: challan.orders.map(o => ({
                            order_number: o.order_number,
                            design_name: o.design_name,
                            fabric_type: o.fabric_type,
                            quantity: Number(o.quantity_meters)
                        })),
                        total_quantity: totalQty,
                        notes: notes,
                        seller_name: business?.name,
                        seller_phone: business?.phone,
                        seller_gstin: business?.gstin,
                        seller_address: business?.address,
                        seller_logo: business?.logo_url
                    };
                    
                    const { buffer } = await generateChallanPDFServer(pdfData);
                    
                    const telegramText = `📦 *Dispatch Created*\n\n` +
                        `*Challan:* ${challan.challanNumber}\n` +
                        `*Customer:* ${firstOrder.customer_name}\n` +
                        `*Orders:* ${challan.orders.length}\n` +
                        `*Fabric:* ${totalQty.toFixed(2)}m\n` +
                        `*Vehicle:* ${vehicleNumber}\n` +
                        `*Driver:* ${driverName || 'N/A'}`;
                        
                    const telegramSent = await sendTelegramDocument(
                        buffer, 
                        `${challan.challanNumber}.pdf`, 
                        { english: telegramText, gujarati: telegramText },
                        'instant_order_alerts' // Or general alert type
                    );
                    
                    if (telegramSent) {
                        const db2 = getDatabase();
                        await db2.prepare('UPDATE dispatch_challans SET telegram_sent = 1 WHERE id = ?').run(challan.id);
                    }
                } catch(e) {
                    console.error('Failed to send challan to telegram', e);
                }
            });
            
            await Promise.allSettled(telegramTasks);

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
