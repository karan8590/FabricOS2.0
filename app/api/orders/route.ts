import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission, unauthorizedResponse } from '@/lib/auth/permissions';
import { NotificationService } from '@/lib/notifications/service';
import { sendTelegramMessage } from '@/lib/telegram';
import { getActiveBusinessId } from '@/lib/auth/business';
import { logAction } from '@/lib/auditLogger';
import { calculateOrderFinancials } from '@/lib/financialEngine';

export async function GET(request: Request) {
    try {
        const { authorized, user, error, status } = await checkPermission('orders.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter');
        let customerId = searchParams.get('customerId');
        const month = searchParams.get('month');
        const dateStart = searchParams.get('dateStart');
        const dateEnd = searchParams.get('dateEnd');
        const minAmount = searchParams.get('minAmount');
        const maxAmount = searchParams.get('maxAmount');
        const searchQuery = searchParams.get('search');

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Security: If user is customer, force customerId to their own ID
        if (user!.role === 'customer' && user!.customerId) {
            customerId = user!.customerId.toString();
        }

        const db = getDatabase();
        let query = `
      SELECT 
        orders.*, 
        customers.name as customer_name,
        customers.phone as customer_phone,
        designs.name as design_name,
        designs.price_per_meter
      FROM orders
      JOIN customers ON orders.customer_id = customers.id
      JOIN designs ON orders.design_id = designs.id
      WHERE orders.business_id = ?
    `;
        const params: any[] = [businessId];

        // Filter by customer
        if (customerId) {
            query += ' AND orders.customer_id = ?';
            params.push(parseInt(customerId));
        }

        // Filter by status
        if (filter === 'pending') {
            query += " AND orders.status = 'pending'";
        } else if (filter === 'completed') {
            query += " AND orders.status IN ('completed', 'invoiced')";
        } else if (filter === 'approved') {
            query += " AND orders.status = 'approved'";
        } else if (filter) {
            query += " AND orders.status = ?";
            params.push(filter);
        }

        // Filter by month (YYYY-MM)
        if (month) {
            const [year, monthNum] = month.split('-');
            const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0);
            const startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
            const endTimestamp = Math.floor(endOfMonth.getTime() / 1000);
            query += ' AND COALESCE(orders.order_date, orders.created_at) >= ? AND COALESCE(orders.order_date, orders.created_at) <= ?';
            params.push(startTimestamp, endTimestamp);
        }

        // Filter by date range
        if (dateStart) {
            query += ' AND COALESCE(orders.order_date, orders.created_at) >= ?';
            params.push(Math.floor(new Date(dateStart).getTime() / 1000));
        }
        if (dateEnd) {
            query += ' AND COALESCE(orders.order_date, orders.created_at) <= ?';
            params.push(Math.floor(new Date(dateEnd).getTime() / 1000) + 86399);
        }

        // Filter by amount
        if (minAmount) {
            query += ' AND orders.total_price >= ?';
            params.push(parseFloat(minAmount));
        }
        if (maxAmount) {
            query += ' AND orders.total_price <= ?';
            params.push(parseFloat(maxAmount));
        }

        // Search text
        if (searchQuery) {
            query += ' AND (customers.name LIKE ? OR designs.name LIKE ? OR CAST(orders.id AS TEXT) LIKE ? OR orders.order_number LIKE ?)';
            const likeParam = `%${searchQuery}%`;
            params.push(likeParam, likeParam, likeParam, likeParam);
        }

        query += ' ORDER BY orders.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const orders = (await db.prepare(query).all(...params)) as any[];

        // Fetch job costs in a single bulk query to avoid N+1 bottleneck
        let mappedOrders = orders;
        if (orders.length > 0) {
            const orderIds = orders.map(o => o.id);
            const placeholders = orderIds.map(() => '?').join(',');
            try {
                const bulkJobCosts = (await db.prepare(`
                    SELECT jc.*, v.name as vendor_name
                    FROM order_job_costs jc
                    LEFT JOIN vendors v ON jc.vendor_id = v.id
                    WHERE jc.order_id IN (${placeholders})
                `).all(...orderIds)) as any[];

                // Group by order_id locally (O(N))
                const jobCostsByOrder = bulkJobCosts.reduce((acc, jc) => {
                    if (!acc[jc.order_id]) acc[jc.order_id] = [];
                    acc[jc.order_id].push(jc);
                    return acc;
                }, {} as Record<number, any[]>);

                mappedOrders = orders.map(order => ({
                    ...order,
                    job_costs: jobCostsByOrder[order.id] || []
                }));
            } catch (error) {
                console.error('Bulk job costs fetch failed:', error);
                mappedOrders = orders.map(order => ({ ...order, job_costs: [] }));
            }
        }

        return NextResponse.json({ 
            orders: mappedOrders,
            pagination: { page, limit }
        });
    } catch (error) {
        console.error('Orders fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, user, error, status } = await checkPermission('orders.create');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const body = await request.json();
        let customerId = body.customerId;
        const { 
            designId, quantityMeters, deliveryDate, orderDate, priority, notes, pricePerUnit, fabric_type: fabricType,
            baseAmount, printingCost, embroideryCostCharged, dyeingCostCharged, additionalCharges, discount, gstRate, gstAmount,
            billingFirmId
        } = body;

        // Security: If user is customer, force customerId to their own ID
        if (user?.role === 'customer') {
            customerId = user.customerId;
        }

        if (!customerId || !designId || !quantityMeters || !fabricType || !billingFirmId) {
            return NextResponse.json(
                { error: 'Missing required fields including Fabric Type and Billing Firm' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // 1. Silent schema migration for legacy support
        try {
            await db.prepare("ALTER TABLE orders ADD COLUMN fabric_type TEXT DEFAULT 'Polyester'").run();
        } catch (e) {
            // Column likely already exists
        }

        // Get design info
        const design = (await db
                        .prepare('SELECT name, price_per_meter FROM designs WHERE id = ?')
                        .get(designId)) as any;

        if (!design) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }
        const designName = design.name;

        let finalPricePerUnit = pricePerUnit || design.price_per_meter;

        const financials = calculateOrderFinancials({
            quantity_meters: quantityMeters,
            price_per_unit: finalPricePerUnit,
            base_amount: baseAmount,
            printing_cost: printingCost,
            embroidery_cost_charged: embroideryCostCharged,
            dyeing_cost_charged: dyeingCostCharged,
            additional_charges: additionalCharges,
            discount: discount,
            gst_rate: gstRate,
            gst_amount: gstAmount
        });

        const totalPrice = financials.finalTotal;

        console.log('[DEBUG] Order creation financials:', {
            payloadTotal: baseAmount || (quantityMeters * finalPricePerUnit),
            calculatedTotal: totalPrice,
            dbSavedTotal: totalPrice
        });

        // --- Order Number Generation ---
        const orderDateObj = orderDate ? new Date(orderDate * 1000) : new Date();
        const yearMonth = `${orderDateObj.getFullYear()}${String(orderDateObj.getMonth() + 1).padStart(2, '0')}`;
        
        // Find latest sequence for current month
        // We look for YYYYMM-XXXX
        const latestOrder = (await db.prepare(`
            SELECT order_number FROM orders 
            WHERE order_number LIKE ? AND business_id = ?
            ORDER BY order_number DESC 
            LIMIT 1
        `).get(`${yearMonth}-%`, businessId)) as any;

        let nextSequence = 1;
        if (latestOrder && latestOrder.order_number) {
            const parts = latestOrder.order_number.split('-');
            if (parts.length === 2) {
                const lastSeq = parseInt(parts[1]);
                if (!isNaN(lastSeq)) {
                    nextSequence = lastSeq + 1;
                }
            }
        }
        
        const orderNumber = `${yearMonth}-${String(nextSequence).padStart(4, '0')}`;

        const result = (await db
                    .prepare(
                        `INSERT INTO orders (
                            customer_id, design_id, quantity_meters, total_price, status, order_stage, order_number, delivery_date, order_date, priority, notes, price_per_unit, business_id,
                            base_amount, printing_cost, embroidery_cost_charged, dyeing_cost_charged, additional_charges, discount, gst_rate, gst_amount, fabric_type, billing_firm_id
                        )
                 VALUES (?, ?, ?, ?, 'created', 'order_added', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    )
                    .run(
                        customerId, 
                        designId, 
                        quantityMeters, 
                        totalPrice, 
                        orderNumber, 
                        deliveryDate || null, 
                        orderDate || Math.floor(Date.now() / 1000),
                        priority || 'Normal', 
                        notes || null,
                        finalPricePerUnit,
                        businessId,
                        financials.baseAmount,
                        financials.printingCost,
                        financials.embroideryCostCharged,
                        financials.dyeingCostCharged,
                        financials.additionalCharges,
                        financials.discount,
                        financials.gstRate,
                        financials.gstAmount,
                        fabricType,
                        billingFirmId
                    ));

        // Update customer total orders
        (await db.prepare(
                    'UPDATE customers SET total_orders = total_orders + 1 WHERE id = ? AND business_id = ?'
                ).run(customerId, businessId));

        // --- Removed Stock Reservation Logic ---
        // Inventory is now only reserved strictly upon workflow 'approval' (STEP 2).

        // Add to activity timeline
        // TODO: add business_id to activity table if needed, ignoring for now as it's an activity log linked to customer_id.

        // Trigger Notification
        // 1. Notify Admins/Managers
        const admins = (await db.prepare("SELECT id FROM users WHERE role IN ('admin', 'manager') AND business_id = ?").all(businessId)) as any[];
        for (const admin of admins) {
            await NotificationService.send({
                userId: admin.id,
                type: 'new_order',
                title: 'New Order Received',
                message: `Order #${orderNumber} placed for ${quantityMeters}m.`,
                meta: { orderId: result.lastInsertRowid }
            });
        }

        // Send Telegram Notification
        try {
            const notifyNewOrderRow = (await db.prepare("SELECT value FROM settings WHERE key = 'notify_new_order'").get()) as any;
            const notifyNewOrder = (notifyNewOrderRow?.value ?? 'on') === 'on';

            if (notifyNewOrder) {
                const custInfo = (await db.prepare('SELECT name, phone FROM customers WHERE id = ? AND business_id = ?').get(customerId, businessId)) as any;
                const designInfo = (await db.prepare('SELECT name FROM designs WHERE id = ? AND business_id = ?').get(designId, businessId)) as any;
                
                const deliveryFormatted = deliveryDate 
                    ? new Date(deliveryDate * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Not specified';
                
                const payloadText = {
                    english: `📥 *New Order Received*\n\n*Order:* #${orderNumber}\n*Customer:* ${custInfo?.name || 'Unknown'} (${custInfo?.phone || ''})\n*Design:* ${designInfo?.name || 'Unknown'}\n*Quantity:* ${quantityMeters}m\n*Amount:* ₹${totalPrice?.toLocaleString('en-IN')}\n*Delivery by:* ${deliveryFormatted}`,
                    gujarati: `📥 *નવો ઓર્ડર પ્રાપ્ત*\n\n*ઓર્ડર:* #${orderNumber}\n*ગ્રાહક:* ${custInfo?.name || 'અજ્ઞાત'} (${custInfo?.phone || ''})\n*ડિઝાઇન:* ${designInfo?.name || 'અજ્ઞાત'}\n*જથ્થો:* ${quantityMeters}m\n*રકમ:* ₹${totalPrice?.toLocaleString('en-IN')}\n*ડિલિવરી:* ${deliveryFormatted}`
                };
                await sendTelegramMessage(payloadText, 'instant_order_alerts');
            }
        } catch (tgError) {
            console.error('Failed to send Telegram notification for new order:', tgError);
        }

        // 2. WhatsApp to Customer
        // Need customer phone.
        const customer = (await db.prepare('SELECT phone FROM customers WHERE id = ? AND business_id = ?').get(customerId, businessId)) as any;
        if (customer && customer.phone) {
            await NotificationService.sendWhatsApp(customer.phone, 'order_confirmed', {
                orderId: result.lastInsertRowid,
                amount: totalPrice
            });
        }

        // Audit log: order creation
        await logAction({
            action: 'create',
            entity: 'order',
            entityId: result.lastInsertRowid?.toString(),
            entityLabel: `Order #${orderNumber}`,
            changes: { customerId, designId, quantityMeters, totalPrice, orderNumber },
            businessId
        });

        const updatedCustomer = (await db.prepare('SELECT total_orders FROM customers WHERE id = ? AND business_id = ?').get(customerId, businessId)) as any;
        const totalCustomerOrders = updatedCustomer?.total_orders || 1;
        const businessOrderCount = (await db.prepare('SELECT COUNT(*) as count FROM orders WHERE business_id = ?').get(businessId)) as any;
        const totalOrdersCount = businessOrderCount?.count || 1;

        return NextResponse.json({
            success: true,
            orderId: result.lastInsertRowid,
            orderNumber: orderNumber,
            totalCustomerOrders: totalCustomerOrders,
            totalOrders: totalOrdersCount
        });
    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
