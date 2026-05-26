import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { calculateGST } from '@/lib/gst';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildProductionUpdateTemplate } from '@/lib/telegram-templates';

// Helper to check authentication
async function getAuthenticatedUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;
        return verifyToken(token);
    } catch {
        return null;
    }
}

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const orderId = parseInt(params.id);
        const db = getDatabase();

        // 1. Fetch current order
        const order = (await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)) as any;
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Fetch all job costs for this order
        const jobCosts = (await db.prepare(`
            SELECT jc.*, v.name AS vendor_name, vp.due_date, vp.amount_paid, vp.status AS vendor_payment_status
            FROM order_job_costs jc
            JOIN vendors v ON jc.vendor_id = v.id
            LEFT JOIN vendor_payments vp ON jc.id = vp.linked_job_cost_id
            WHERE jc.order_id = ?
            ORDER BY jc.created_at DESC
        `).all(orderId)) as any[];

        // 3. Calculate linked fabric purchase costs from inventory_fabric
        const orderNum = order.order_number || '';
        const fabricCostRow = (await db.prepare(`
            SELECT SUM(purchase_cost) AS val 
            FROM inventory_fabric 
            WHERE linked_order_no = ? OR linked_order_no = ?
        `).get(orderNum, `#${orderNum}`)) as any;
        const fabricPurchaseCost = fabricCostRow?.val || 0;

        return NextResponse.json({
            jobCosts,
            fabricPurchaseCost
        });
    } catch (error) {
        console.error('Fetch job costs error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const orderId = parseInt(params.id);
        const body = await request.json();

        const {
            type, // 'embroidery' | 'dyeing'
            vendor_id,
            metres,
            rate_per_metre,
            total_cost,
            date,
            due_date, // required due date for vendor payments
            payment_mode,
            reference,
            status, // 'paid' | 'unpaid'
            notes,
            has_gst,
            gst_rate,
            itc_claimed
        } = body;

        if (!type || !vendor_id || metres === undefined || rate_per_metre === undefined || total_cost === undefined || !date || !due_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();

        // Fetch Order & Vendor details for logging & Cash Book insertion
        const order = (await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)) as any;
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const vendor = (await db.prepare('SELECT name, contact, gst_no as gstin, state, state_code FROM vendors WHERE id = ?').get(vendor_id)) as any;
        if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });

        let calculatedHasGst = has_gst ? 1 : 0;
        let calculatedGstRate = parseFloat(gst_rate || '0');
        let calculatedGstAmount = 0;
        let calculatedTaxableAmount = total_cost;
        let calculatedGstType = 'NONE';
        
        if (calculatedHasGst && vendor.gstin) {
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            const sellerStateCode = gstConfig?.stateCode || '24';
            
            const supplierStateCode = vendor.gstin.substring(0, 2);
            
            const gstRes = calculateGST({
                amount: total_cost,
                rate: calculatedGstRate,
                stateCode: supplierStateCode,
                isB2B: true,
                isInclusive: true
            });
            
            calculatedTaxableAmount = parseFloat(gstRes.taxableAmount.toFixed(2));
            calculatedGstAmount = parseFloat(gstRes.gstAmount.toFixed(2));
            calculatedGstType = supplierStateCode === sellerStateCode ? 'CGST_SGST' : 'IGST';
        } else if (calculatedHasGst && !vendor.gstin) {
             // Handle unregistered dealer (URD) charging GST? Rare, but calculate it anyway as IGST or CGST/SGST based on seller state
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            const sellerStateCode = gstConfig?.stateCode || '24';
             const gstRes = calculateGST({
                amount: total_cost,
                rate: calculatedGstRate,
                stateCode: sellerStateCode,
                isB2B: false,
                isInclusive: true
            });
            calculatedTaxableAmount = parseFloat(gstRes.taxableAmount.toFixed(2));
            calculatedGstAmount = parseFloat(gstRes.gstAmount.toFixed(2));
            calculatedGstType = 'CGST_SGST';
        }

        // Start transaction for atomic insertion
        const insertTx = db.transaction(async () => {
            // 1. Insert into order_job_costs
            const result = (await db.prepare(`
                INSERT INTO order_job_costs (
                    order_id, type, vendor_id, metres, rate_per_metre, total_cost, 
                    date, payment_mode, reference, status, notes,
                    has_gst, gst_rate, gst_amount, taxable_amount, gst_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                            orderId,
                            type,
                            vendor_id,
                            metres,
                            rate_per_metre,
                            total_cost,
                            date,
                            payment_mode || 'Cash',
                            reference || '',
                            status,
                            notes || '',
                            calculatedHasGst,
                            calculatedGstRate,
                            calculatedGstAmount,
                            calculatedTaxableAmount,
                            calculatedGstType
                        ));

            const jobCostId = result.lastInsertRowid;
            
            // update itc_claimed if provided
            if (itc_claimed !== undefined) {
                (await db.prepare('UPDATE order_job_costs SET itc_claimed = ? WHERE id = ?').run(itc_claimed ? 1 : 0, jobCostId));
            }
            const linkedId = `order:${orderId}:cost:${jobCostId}`;

            // 2. Insert into Cash Book (expenses table) as auto-created entry
            const category = type === 'embroidery' ? 'Embroidery Work' : 'Dyeing Work';
            const displayType = type === 'embroidery' ? 'Embroidery' : 'Dyeing';
            const description = `${displayType} — ${vendor.name} for #${order.order_number || orderId}`;
            const dateTimestamp = Math.floor(new Date(date).getTime() / 1000);
            const now = Math.floor(Date.now() / 1000);

            (await db.prepare(`
                INSERT INTO expenses (
                    category, amount, date, description, paymentMode, reference, notes, 
                    addedBy, created_by_user_id, isAuto, linkedId, type, customerName, isPending, created_at,
                    has_gst, supplier_gstin, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'out', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                            category,
                            total_cost,
                            dateTimestamp,
                            description,
                            payment_mode || 'Cash',
                            reference || '',
                            notes || '',
                            user.userId,
                            user.userId,
                            linkedId,
                            vendor.name,
                            status === 'paid' ? 0 : 1,
                            now,
                            calculatedHasGst,
                            vendor.gstin || null,
                            calculatedTaxableAmount,
                            calculatedGstRate,
                            calculatedGstAmount,
                            calculatedGstType,
                            itc_claimed !== undefined ? (itc_claimed ? 1 : 0) : (calculatedHasGst ? 1 : 0) // Manual or auto
                        ));

            // 3. Automatically create Accounts Payable vendor_payment entry
            // Determine initial status based on due date vs today
            const isPaid = status === 'paid';
            const amountPaid = isPaid ? total_cost : 0;
            const balance = isPaid ? 0 : total_cost;
            const todayStr = new Date().toISOString().split('T')[0];
            const vendorPaymentStatus = isPaid ? 'paid' : (due_date < todayStr ? 'overdue' : 'unpaid');

            (await db.prepare(`
                INSERT INTO vendor_payments (
                    vendor_id, vendor_name, vendor_phone, order_id, order_number, 
                    work_type, total_amount, amount_paid, balance, due_date, status, linked_job_cost_id,
                    has_gst, gst_rate, gst_amount, taxable_amount, gst_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                            vendor_id,
                            vendor.name,
                            vendor.contact || '',
                            orderId,
                            order.order_number || orderId.toString(),
                            type,
                            total_cost,
                            amountPaid,
                            balance,
                            due_date,
                            vendorPaymentStatus,
                            jobCostId,
                            calculatedHasGst,
                            calculatedGstRate,
                            calculatedGstAmount,
                            calculatedTaxableAmount,
                            calculatedGstType
                        ));

            // 4. Recalculate and update order running totals
            recalculateRunningTotals(db, orderId);

            return jobCostId;
        });

        const jobCostId = await insertTx();

        return NextResponse.json({ success: true, jobCostId });
    } catch (error) {
        console.error('Create job cost error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const orderId = parseInt(params.id);
        const body = await request.json();

        const {
            id,
            type,
            vendor_id,
            metres,
            rate_per_metre,
            total_cost,
            date,
            due_date, // required due date for vendor payments
            payment_mode,
            reference,
            status,
            notes,
            has_gst,
            gst_rate,
            itc_claimed
        } = body;

        if (!id || !type || !vendor_id || metres === undefined || rate_per_metre === undefined || total_cost === undefined || !date || !due_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();

        const order = (await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)) as any;
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const vendor = (await db.prepare('SELECT name, contact, gst_no as gstin, state, state_code FROM vendors WHERE id = ?').get(vendor_id)) as any;
        if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });

        let calculatedHasGst = has_gst !== undefined ? (has_gst ? 1 : 0) : 0;
        let calculatedGstRate = gst_rate !== undefined ? parseFloat(gst_rate) : 0;
        let calculatedGstAmount = 0;
        let calculatedTaxableAmount = total_cost;
        let calculatedGstType = 'NONE';
        
        if (calculatedHasGst && vendor.gstin) {
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            const sellerStateCode = gstConfig?.stateCode || '24';
            
            const supplierStateCode = vendor.gstin.substring(0, 2);
            
            const gstRes = calculateGST({
                amount: total_cost,
                rate: calculatedGstRate,
                stateCode: supplierStateCode,
                isB2B: true,
                isInclusive: true
            });
            
            calculatedTaxableAmount = parseFloat(gstRes.taxableAmount.toFixed(2));
            calculatedGstAmount = parseFloat(gstRes.gstAmount.toFixed(2));
            calculatedGstType = supplierStateCode === sellerStateCode ? 'CGST_SGST' : 'IGST';
        } else if (calculatedHasGst && !vendor.gstin) {
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            const sellerStateCode = gstConfig?.stateCode || '24';
             const gstRes = calculateGST({
                amount: total_cost,
                rate: calculatedGstRate,
                stateCode: sellerStateCode,
                isB2B: false,
                isInclusive: true
            });
            calculatedTaxableAmount = parseFloat(gstRes.taxableAmount.toFixed(2));
            calculatedGstAmount = parseFloat(gstRes.gstAmount.toFixed(2));
            calculatedGstType = 'CGST_SGST';
        }

        // Deletion & Edition safety checks
        const existingPayment = (await db.prepare('SELECT * FROM vendor_payments WHERE linked_job_cost_id = ?').get(id)) as any;
        if (existingPayment) {
            if (existingPayment.amount_paid > 0 && status === 'unpaid') {
                return NextResponse.json({ error: 'Cannot change status to unpaid because payments have already been made to this vendor.' }, { status: 400 });
            }
            if (total_cost < existingPayment.amount_paid) {
                return NextResponse.json({ error: `Total cost cannot be less than the amount already paid (₹${existingPayment.amount_paid.toLocaleString('en-IN')}).` }, { status: 400 });
            }
        }

        const updateTx = db.transaction(async () => {
            // 1. Update order_job_costs
            (await db.prepare(`
                UPDATE order_job_costs 
                SET type = ?, vendor_id = ?, metres = ?, rate_per_metre = ?, total_cost = ?, 
                    date = ?, payment_mode = ?, reference = ?, status = ?, notes = ?,
                    has_gst = ?, gst_rate = ?, gst_amount = ?, taxable_amount = ?, gst_type = ?
                WHERE id = ? AND order_id = ?
            `).run(
                            type,
                            vendor_id,
                            metres,
                            rate_per_metre,
                            total_cost,
                            date,
                            payment_mode || 'Cash',
                            reference || '',
                            status,
                            notes || '',
                            calculatedHasGst,
                            calculatedGstRate,
                            calculatedGstAmount,
                            calculatedTaxableAmount,
                            calculatedGstType,
                            id,
                            orderId
                        ));

            if (itc_claimed !== undefined) {
                (await db.prepare('UPDATE order_job_costs SET itc_claimed = ? WHERE id = ?').run(itc_claimed ? 1 : 0, id));
            }

            // 2. Sync to Cash Book (expenses table)
            const linkedId = `order:${orderId}:cost:${id}`;
            const category = type === 'embroidery' ? 'Embroidery Work' : 'Dyeing Work';
            const displayType = type === 'embroidery' ? 'Embroidery' : 'Dyeing';
            const description = `${displayType} — ${vendor.name} for #${order.order_number || orderId}`;
            const dateTimestamp = Math.floor(new Date(date).getTime() / 1000);
            const now = Math.floor(Date.now() / 1000);

            // Check if expense entry exists
            const existingExpense = (await db.prepare('SELECT id FROM expenses WHERE linkedId = ?').get(linkedId));

            if (existingExpense) {
                (await db.prepare(`
                    UPDATE expenses 
                    SET category = ?, amount = ?, date = ?, description = ?, paymentMode = ?, 
                        reference = ?, notes = ?, customerName = ?, isPending = ?,
                        has_gst = ?, supplier_gstin = ?, taxable_amount = ?, gst_rate = ?, gst_amount = ?, gst_type = ?, itc_claimed = ?
                    WHERE linkedId = ?
                `).run(
                                    category,
                                    total_cost,
                                    dateTimestamp,
                                    description,
                                    payment_mode || 'Cash',
                                    reference || '',
                                    notes || '',
                                    vendor.name,
                                    status === 'paid' ? 0 : 1,
                                    calculatedHasGst,
                                    vendor.gstin || null,
                                    calculatedTaxableAmount,
                                    calculatedGstRate,
                                    calculatedGstAmount,
                                    calculatedGstType,
                                    itc_claimed !== undefined ? (itc_claimed ? 1 : 0) : (calculatedHasGst ? 1 : 0),
                                    linkedId
                                ));
            } else {
                (await db.prepare(`
                    INSERT INTO expenses (
                        category, amount, date, description, paymentMode, reference, notes, 
                        addedBy, created_by_user_id, isAuto, linkedId, type, customerName, isPending, created_at,
                        has_gst, supplier_gstin, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'out', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                                    category,
                                    total_cost,
                                    dateTimestamp,
                                    description,
                                    payment_mode || 'Cash',
                                    reference || '',
                                    notes || '',
                                    user.userId,
                                    user.userId,
                                    linkedId,
                                    vendor.name,
                                    status === 'paid' ? 0 : 1,
                                    calculatedHasGst,
                                    vendor.gstin || null,
                                    calculatedTaxableAmount,
                                    calculatedGstRate,
                                    calculatedGstAmount,
                                    calculatedGstType,
                                    itc_claimed !== undefined ? (itc_claimed ? 1 : 0) : (calculatedHasGst ? 1 : 0)
                                ));
            }

            // 3. Sync and update Accounts Payable vendor_payment entry
            let amountPaid = 0;
            let newBalance = total_cost;
            let newStatus = 'unpaid';
            const todayStr = new Date().toISOString().split('T')[0];

            if (existingPayment) {
                if (status === 'paid') {
                    amountPaid = total_cost;
                    newBalance = 0;
                    newStatus = 'paid';
                } else {
                    amountPaid = existingPayment.amount_paid;
                    newBalance = total_cost - amountPaid;
                    if (newBalance <= 0) {
                        newStatus = 'paid';
                    } else if (amountPaid > 0) {
                        newStatus = 'partial';
                    } else if (due_date < todayStr) {
                        newStatus = 'overdue';
                    } else {
                        newStatus = 'unpaid';
                    }
                }

                (await db.prepare(`
                    UPDATE vendor_payments 
                    SET vendor_id = ?, vendor_name = ?, vendor_phone = ?, total_amount = ?, 
                        amount_paid = ?, balance = ?, due_date = ?, status = ?,
                        has_gst = ?, gst_rate = ?, gst_amount = ?, taxable_amount = ?, gst_type = ?
                    WHERE linked_job_cost_id = ?
                `).run(
                                    vendor_id,
                                    vendor.name,
                                    vendor.contact || '',
                                    total_cost,
                                    amountPaid,
                                    newBalance,
                                    due_date,
                                    newStatus,
                                    calculatedHasGst,
                                    calculatedGstRate,
                                    calculatedGstAmount,
                                    calculatedTaxableAmount,
                                    calculatedGstType,
                                    id
                                ));
            } else {
                if (status === 'paid') {
                    amountPaid = total_cost;
                    newBalance = 0;
                    newStatus = 'paid';
                } else {
                    amountPaid = 0;
                    newBalance = total_cost;
                    newStatus = due_date < todayStr ? 'overdue' : 'unpaid';
                }

                (await db.prepare(`
                    INSERT INTO vendor_payments (
                        vendor_id, vendor_name, vendor_phone, order_id, order_number, 
                        work_type, total_amount, amount_paid, balance, due_date, status, linked_job_cost_id,
                        has_gst, gst_rate, gst_amount, taxable_amount, gst_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                                    vendor_id,
                                    vendor.name,
                                    vendor.contact || '',
                                    orderId,
                                    order.order_number || orderId.toString(),
                                    type,
                                    total_cost,
                                    amountPaid,
                                    newBalance,
                                    due_date,
                                    newStatus,
                                    id,
                                    calculatedHasGst,
                                    calculatedGstRate,
                                    calculatedGstAmount,
                                    calculatedTaxableAmount,
                                    calculatedGstType
                                ));
            }

            // 4. Recalculate and update order running totals
            recalculateRunningTotals(db, orderId);
        });

        await updateTx();

        // Send Telegram Notification for Production Update
        try {
            const orderInfo = (await db.prepare('SELECT o.order_number, d.name as design_name FROM orders o JOIN designs d ON o.design_id = d.id WHERE o.id = ?').get(orderId)) as any;
            if (orderInfo) {
                const nextStep = type === 'dyeing' ? 'Embroidery Processing' : 'Ready for Dispatch';
                const payloadText = buildProductionUpdateTemplate({
                    orderNo: orderInfo.order_number || orderId.toString(),
                    fabric: orderInfo.design_name || 'Fabric',
                    quantity: metres,
                    currentStatus: type === 'dyeing' ? 'Dyeing Processing' : 'Embroidery Processing',
                    nextStep: nextStep,
                    expectedDelivery: 'TBD'
                });
                sendTelegramMessage(payloadText, 'instant_order_alerts').catch(console.error);
            }
        } catch (tgErr) {
            console.error('Failed to send Telegram production update:', tgErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update job cost error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const orderId = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const costId = searchParams.get('costId');

        if (!costId) {
            return NextResponse.json({ error: 'Missing costId parameter' }, { status: 400 });
        }

        const db = getDatabase();

        // Safety check: block delete if payments are recorded in vendor_payments
        const existingPayment = (await db.prepare('SELECT amount_paid FROM vendor_payments WHERE linked_job_cost_id = ?').get(parseInt(costId))) as any;
        if (existingPayment && existingPayment.amount_paid > 0) {
            return NextResponse.json({ error: 'Cannot delete job cost because payments have already been made to this vendor.' }, { status: 400 });
        }

        const deleteTx = db.transaction(async () => {
            // 1. Delete from order_job_costs
            (await db.prepare('DELETE FROM order_job_costs WHERE id = ? AND order_id = ?').run(parseInt(costId), orderId));

            // 2. Delete linked Cash Book entry
            const linkedId = `order:${orderId}:cost:${costId}`;
            (await db.prepare('DELETE FROM expenses WHERE linkedId = ?').run(linkedId));

            // 3. Delete linked Accounts Payable vendor_payment entry
            (await db.prepare('DELETE FROM vendor_payments WHERE linked_job_cost_id = ?').run(parseInt(costId)));

            // 4. Recalculate order running totals
            recalculateRunningTotals(db, orderId);
        });

        await deleteTx();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete job cost error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Recalculates embroidery_job_cost and dyeing_job_cost for a given order
async function recalculateRunningTotals(db: any, orderId: number) {
    const embroiderySumRow = (await db.prepare(`
        SELECT SUM(total_cost) AS val 
        FROM order_job_costs 
        WHERE order_id = ? AND type = 'embroidery'
    `).get(orderId)) as any;
    const embroideryTotal = embroiderySumRow?.val || 0;

    const dyeingSumRow = (await db.prepare(`
        SELECT SUM(total_cost) AS val 
        FROM order_job_costs 
        WHERE order_id = ? AND type = 'dyeing'
    `).get(orderId)) as any;
    const dyeingTotal = dyeingSumRow?.val || 0;

    (await db.prepare(`
        UPDATE orders 
        SET embroidery_job_cost = ?, dyeing_job_cost = ?
        WHERE id = ?
    `).run(embroideryTotal, dyeingTotal, orderId));
}
