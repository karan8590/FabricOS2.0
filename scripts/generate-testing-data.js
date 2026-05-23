const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Starting Testing Data Generation (Jan 2025 - May 2026)...');

db.transaction(() => {
    // 1. DELETE DATA
    console.log('Deleting operational data...');
    db.prepare("DELETE FROM users WHERE role = 'customer'").run();
    db.prepare("DELETE FROM customers").run();
    db.prepare("DELETE FROM orders").run();
    db.prepare("DELETE FROM invoices").run();
    db.prepare("DELETE FROM payments").run();
    db.prepare("DELETE FROM expenses").run();
    db.prepare("DELETE FROM vendors").run();
    db.prepare("DELETE FROM vendor_payments").run();
    db.prepare("DELETE FROM vendor_payment_instalments").run();
    db.prepare("DELETE FROM order_job_costs").run();
    db.prepare("DELETE FROM inventory_fabric").run();
    db.prepare("DELETE FROM inventory_ink").run();
    db.prepare("DELETE FROM inventory_packaging").run();
    
    try { db.prepare("DELETE FROM inventory_stock_transactions").run(); } catch(e){}
    try { db.prepare("DELETE FROM challans").run(); } catch(e){}
    
    db.prepare("DELETE FROM activity").run();
    db.prepare("DELETE FROM notifications").run();
    db.prepare("DELETE FROM salaries").run();
    db.prepare("DELETE FROM employee_advances").run();
    db.prepare("DELETE FROM advance_instalments").run();
    db.prepare("DELETE FROM attendance").run();
    
    console.log('Operational data cleared.');

    const businessId = 'business_001';

    // 2. GENERATE VENDORS
    const vendorInsert = db.prepare(`
        INSERT INTO vendors (business_id, name, contact, material_supplied, city, gst_no, state, state_code, vendor_type, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const embroideryVendor = Number(vendorInsert.run(businessId, 'Embroidery Master', '+919999999111', 'Embroidery', 'Surat', '24AAAAA1111A1Z1', 'Gujarat', '24', 'Embroidery Job Work', 0).lastInsertRowid);
    const dyeingVendor = Number(vendorInsert.run(businessId, 'Perfect Dyeing', '+919999999222', 'Dyeing', 'Surat', '24BBBBB2222B2Z2', 'Gujarat', '24', 'Dyeing Job Work', 0).lastInsertRowid);
    const fabricVendor = Number(vendorInsert.run(businessId, 'Surat Textiles', '+919999999333', 'Raw Fabric', 'Surat', '24CCCCC3333C3Z3', 'Gujarat', '24', 'Fabric Supplier', 0).lastInsertRowid);

    // 3. GENERATE CUSTOMERS
    const customerInsert = db.prepare(`
        INSERT INTO customers (business_id, name, phone, outstanding_amount, total_orders, gstin, state, state_code, customer_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const customerIds = [];
    for (let i = 1; i <= 20; i++) {
        const c = customerInsert.run(businessId, `Customer ${i}`, `+918888888${i.toString().padStart(3, '0')}`, 0, 0, `24XXXXX${i.toString().padStart(4, '0')}X1Z1`, 'Gujarat', '24', 'B2B');
        customerIds.push(Number(c.lastInsertRowid));
    }

    // 4. FETCH DESIGNS & EMPLOYEES
    const designs = db.prepare("SELECT id, price_per_meter FROM designs").all();
    const employees = db.prepare("SELECT id, monthly_salary FROM users WHERE role = 'staff'").all();
    
    if (designs.length === 0) {
        throw new Error('No designs found. Please run master-seed.js first to get base catalog.');
    }
    if (employees.length === 0) {
        throw new Error('No staff employees found.');
    }

    // GENERATION DATES: Jan 1, 2025 to May 20, 2026
    const startDate = new Date('2025-01-01T00:00:00Z').getTime();
    const endDate = new Date('2026-05-20T00:00:00Z').getTime();
    const oneDay = 86400000;

    const orderInsert = db.prepare(`
        INSERT INTO orders (business_id, customer_id, design_id, quantity_meters, total_price, status, order_number, created_at, approved_at, completed_at, embroidery_job_cost, dyeing_job_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const invoiceInsert = db.prepare(`
        INSERT INTO invoices (business_id, invoice_number, order_id, customer_id, amount, amount_paid, status, gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount, taxable_amount, gst_type, generated_at, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const paymentInsert = db.prepare(`
        INSERT INTO payments (business_id, invoice_id, customer_id, amount, method, reference_number, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderJobCostInsert = db.prepare(`
        INSERT INTO order_job_costs (order_id, type, vendor_id, metres, rate_per_metre, total_cost, date, payment_mode, reference, status, notes, created_at, has_gst, gst_rate, gst_amount, taxable_amount, gst_type, business_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const vendorPaymentInsert = db.prepare(`
        INSERT INTO vendor_payments (vendor_id, vendor_name, vendor_phone, order_id, order_number, work_type, total_amount, amount_paid, balance, due_date, status, notes, created_at, has_gst, gst_rate, gst_amount, taxable_amount, gst_type, business_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const salaryInsert = db.prepare(`
        INSERT INTO salaries (business_id, employee_id, month, working_days, present_days, absent_days, half_days, overtime_hours, basic_earned, overtime_pay, deductions, advance_recovery, net_payable, status, payment_method, reference_number, payment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let orderCounter = 1;
    let invoiceCounter = 1;
    
    for (let current = startDate; current <= endDate; current += oneDay) {
        const d = new Date(current);
        const currentSecs = Math.floor(current / 1000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const is2025 = yyyy === 2025;

        // Generate 1-2 orders per day
        const ordersToday = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < ordersToday; i++) {
            const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
            const design = designs[Math.floor(Math.random() * designs.length)];
            const quantity = (Math.floor(Math.random() * 5) + 1) * 100; // 100 to 500 meters
            const price = design.price_per_meter * quantity;
            
            let status = 'delivered';
            if (!is2025 && current > endDate - 10 * oneDay) {
                status = ['approved', 'embroidery_in_progress', 'printing_in_factory', 'dyeing_in_progress', 'ready'][Math.floor(Math.random() * 5)];
            }
            
            const embroideryRate = 20;
            const dyeingRate = 15;
            const embCost = quantity * embroideryRate;
            const dyeCost = quantity * dyeingRate;

            const orderNum = `ORD-${yyyy}-${orderCounter.toString().padStart(4, '0')}`;
            const o = orderInsert.run(
                businessId, customerId, design.id, quantity, price, status, orderNum, 
                currentSecs, currentSecs + 86400, status === 'delivered' ? currentSecs + (5 * 86400) : null,
                embCost, dyeCost
            );
            const orderId = Number(o.lastInsertRowid);
            orderCounter++;

            // Create job works (assuming paid immediately or shortly)
            orderJobCostInsert.run(orderId, 'embroidery', embroideryVendor, quantity, embroideryRate, embCost, d.toISOString().split('T')[0], 'upi', 'REF', 'unpaid', null, currentSecs + 86400, 1, 5, embCost * 0.05, embCost, 'CGST_SGST', businessId);
            vendorPaymentInsert.run(embroideryVendor, 'Embroidery Master', '+919999999111', orderId, orderNum, 'embroidery', embCost * 1.05, embCost * 1.05, 0, new Date(current + 3 * 86400000).toISOString().split('T')[0], 'paid', null, currentSecs, 1, 5, embCost * 0.05, embCost, 'CGST_SGST', businessId);
            
            orderJobCostInsert.run(orderId, 'dyeing', dyeingVendor, quantity, dyeingRate, dyeCost, d.toISOString().split('T')[0], 'upi', 'REF', 'unpaid', null, currentSecs + 2 * 86400, 1, 5, dyeCost * 0.05, dyeCost, 'CGST_SGST', businessId);
            vendorPaymentInsert.run(dyeingVendor, 'Perfect Dyeing', '+919999999222', orderId, orderNum, 'dyeing', dyeCost * 1.05, dyeCost * 1.05, 0, new Date(current + 4 * 86400000).toISOString().split('T')[0], 'paid', null, currentSecs, 1, 5, dyeCost * 0.05, dyeCost, 'CGST_SGST', businessId);

            if (status === 'delivered') {
                const invNo = `INV-${yyyy}-${invoiceCounter.toString().padStart(4, '0')}`;
                invoiceCounter++;
                const taxable = price;
                const gst = taxable * 0.05;
                const total = taxable + gst;
                
                const inv = invoiceInsert.run(
                    businessId, invNo, orderId, customerId, total, total, 'paid', 5, gst, gst/2, gst/2, 0, taxable, 'CGST_SGST', currentSecs + (5 * 86400), currentSecs + (15 * 86400)
                );
                
                // Add payment
                paymentInsert.run(businessId, Number(inv.lastInsertRowid), customerId, total, 'bank_transfer', 'REF-' + invNo, currentSecs + (15 * 86400), 'Full payment');
            }
        }
        
        // Staff Salary at last day of month
        // Find if this is the last day of the month
        const nextDay = new Date(current + oneDay);
        if (nextDay.getUTCMonth() !== d.getUTCMonth()) {
            // It's the last day of the month! Generate salary.
            for (const emp of employees) {
                const monthlySal = emp.monthly_salary || 30000;
                salaryInsert.run(
                    businessId,
                    emp.id,
                    `${yyyy}-${mm}`,
                    d.getUTCDate(), // working days
                    d.getUTCDate() - 2, // present days (approx)
                    2, // absent days
                    0, 0,
                    monthlySal, 0, 0, 0, monthlySal,
                    'paid', 'bank_transfer', `SAL-${yyyy}${mm}-${emp.id}`, `${yyyy}-${mm}-${String(d.getUTCDate()).padStart(2, '0')}`
                );
            }
        }
    }
    
    
    // Generate expenses for job costs (for GST Report input tax)
    const expenseInsert = db.prepare(`
        INSERT INTO expenses (business_id, date, amount, category, description, paymentMode, reference, addedBy, type, customerName, has_gst, supplier_gstin, invoice_no, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed, isAuto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const jobCosts = db.prepare('SELECT * FROM order_job_costs').all();
    for (const jc of jobCosts) {
        const vendor = db.prepare('SELECT name, gst_no FROM vendors WHERE id = ?').get(jc.vendor_id);
        const invNo = jc.type === 'embroidery' ? `EMB-INV-${jc.id}` : `DYE-INV-${jc.id}`;
        expenseInsert.run(
            businessId, jc.date, jc.total_cost + jc.gst_amount, 
            jc.type === 'embroidery' ? 'job_work_embroidery' : 'job_work_dyeing',
            'Job work for Order ' + jc.order_id, jc.payment_mode, jc.reference, 1, 'out',
            vendor.name, 1, vendor.gst_no, invNo, jc.total_cost, jc.gst_rate, jc.gst_amount, jc.gst_type, 1, 1
        );
    }
    
    // Update Customer balances (although all are 0 since fully paid)
    
    db.prepare(`
        UPDATE customers SET outstanding_amount = (
            SELECT COALESCE(SUM(amount - amount_paid), 0) FROM invoices WHERE customer_id = customers.id
        ), total_orders = (
            SELECT COUNT(*) FROM orders WHERE customer_id = customers.id
        )
    `).run();

    console.log('✅ Testing data (orders, invoices, job costs, salaries) generated successfully!');
})();
