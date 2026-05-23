const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('🌱 Starting massive data seed from Jan 2025 to May 2026...');

// --- 1. CLEAR EXISTING DATA (Except admins & settings) ---
db.exec('PRAGMA foreign_keys = OFF;');
db.exec(`
    DELETE FROM users WHERE role = 'customer';
    DELETE FROM customers;
    DELETE FROM designs;
    DELETE FROM orders;
    DELETE FROM invoices;
    DELETE FROM expenses;
    DELETE FROM vendors;
    DELETE FROM payments;
    DELETE FROM activity;
    DELETE FROM attendance;
    DELETE FROM advances;
    DELETE FROM salaries;
    DELETE FROM employee_advances;
    DELETE FROM advance_instalments;
    DELETE FROM inventory_fabric;
    DELETE FROM notifications;
    DELETE FROM challans;
    DELETE FROM order_job_costs;
    DELETE FROM vendor_payments;
    DELETE FROM vendor_payment_instalments;
`);
db.exec('PRAGMA foreign_keys = ON;');
console.log('✅ Cleared all operational tables.');

// --- 2. GENERATORS & UTILS ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBoolean = (prob = 0.5) => Math.random() < prob;

// Dates between Jan 1 2025 and May 20 2026
const startTs = new Date('2025-01-01T00:00:00Z').getTime() / 1000;
const endTs = new Date('2026-05-20T23:59:59Z').getTime() / 1000;

function getRandomTimestamp() {
    // Weight slightly towards 2026
    const mid = new Date('2025-10-01T00:00:00Z').getTime() / 1000;
    if (Math.random() > 0.4) {
        return Math.floor(mid + Math.random() * (endTs - mid));
    }
    return Math.floor(startTs + Math.random() * (endTs - startTs));
}

// Names and Data
const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Myra', 'Anya', 'Kiara', 'Aadhya', 'Ananya', 'Pari', 'Saanvi', 'Riya', 'Kriti', 'Rahul', 'Neha', 'Pooja', 'Rohan', 'Amit', 'Vikram', 'Priya', 'Kavya'];
const lastNames = ['Patel', 'Sharma', 'Singh', 'Kumar', 'Desai', 'Shah', 'Mehta', 'Jain', 'Agarwal', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Yadav', 'Chaudhary', 'Iyer', 'Menon', 'Joshi', 'Bhatt', 'Nair'];

const cities = ['Surat', 'Mumbai', 'Ahmedabad', 'Delhi', 'Jaipur', 'Tiruppur', 'Bhilwara', 'Ludhiana', 'Kolkata', 'Chennai'];
const stateMap = {
    'Surat': { state: 'Gujarat', code: '24' },
    'Ahmedabad': { state: 'Gujarat', code: '24' },
    'Mumbai': { state: 'Maharashtra', code: '27' },
    'Delhi': { state: 'Delhi', code: '07' },
    'Jaipur': { state: 'Rajasthan', code: '08' },
    'Tiruppur': { state: 'Tamil Nadu', code: '33' },
    'Bhilwara': { state: 'Rajasthan', code: '08' },
    'Ludhiana': { state: 'Punjab', code: '03' },
    'Kolkata': { state: 'West Bengal', code: '19' },
    'Chennai': { state: 'Tamil Nadu', code: '33' }
};

const businessTypes = ['Textiles', 'Boutique', 'Emporium', 'Silks', 'Fashion', 'Sarees', 'Creation', 'Trends'];

function generateName() {
    return `${randomEl(firstNames)} ${randomEl(lastNames)}`;
}

function generateBusinessName(name) {
    return `${name} ${randomEl(businessTypes)}`;
}

function generateGSTIN(stateCode) {
    if (!stateCode) return null;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let gstin = stateCode;
    for(let i=0; i<10; i++) gstin += chars.charAt(Math.floor(Math.random() * chars.length));
    gstin += '1Z';
    gstin += chars.charAt(Math.floor(Math.random() * chars.length));
    return gstin;
}

const fabrics = [
    { name: 'Cotton Floral Print', cat: 'Printed Cotton', basePrice: 85, gst: 5 },
    { name: 'Linen Stripes', cat: 'Linen', basePrice: 150, gst: 5 },
    { name: 'Velvet Solid Luxe', cat: 'Velvet', basePrice: 350, gst: 12 },
    { name: 'Georgette Embroidery', cat: 'Georgette', basePrice: 220, gst: 5 },
    { name: 'Silk Paisley', cat: 'Silk', basePrice: 550, gst: 12 },
    { name: 'Rayon Abstract', cat: 'Rayon', basePrice: 95, gst: 5 },
    { name: 'Premium Viscose', cat: 'Viscose', basePrice: 180, gst: 5 },
    { name: 'Chanderi Handloom', cat: 'Handloom', basePrice: 320, gst: 5 },
    { name: 'Banarasi Brocade', cat: 'Brocade', basePrice: 650, gst: 12 },
    { name: 'Crepe Polka Dots', cat: 'Crepe', basePrice: 140, gst: 5 }
];

// GST Calculation
function calculateGST(amount, rate, supplierStateCode, sellerStateCode = '24') {
    const isB2B = !!supplierStateCode;
    const taxableAmount = parseFloat((amount / (1 + (rate / 100))).toFixed(2));
    const gstAmount = parseFloat((amount - taxableAmount).toFixed(2));

    let gstType = 'NONE';
    if (rate > 0) {
        if (!isB2B) {
            gstType = 'CGST_SGST';
        } else {
            gstType = supplierStateCode === sellerStateCode ? 'CGST_SGST' : 'IGST';
        }
    }

    return {
        taxableAmount,
        gstAmount,
        cgstAmount: gstType === 'CGST_SGST' ? parseFloat((gstAmount / 2).toFixed(2)) : 0,
        sgstAmount: gstType === 'CGST_SGST' ? parseFloat((gstAmount / 2).toFixed(2)) : 0,
        igstAmount: gstType === 'IGST' ? gstAmount : 0,
        gstType
    };
}

// --- 3. SEEDING STAFF (USERS) ---
console.log('Seeding Staff/Employees...');
const insertUser = db.prepare(`
    INSERT INTO users (phone, password_hash, name, role, is_active, monthly_salary, created_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
`);
const employees = [];
for (let i = 0; i < 5; i++) {
    const name = generateName();
    const phone = '8' + Math.floor(Math.random() * 900000000 + 100000000).toString();
    const salary = randomInt(15000, 45000);
    const info = insertUser.run(phone, 'hash', name, randomBoolean(0.8) ? 'staff' : 'manager', salary, startTs);
    employees.push({ id: info.lastInsertRowid, name, salary });
}

// --- 4. SEEDING CUSTOMERS ---
console.log('Seeding Customers...');
const insertCustomer = db.prepare(`
    INSERT INTO customers (name, phone, outstanding_amount, total_orders, gstin, state, state_code, customer_type, created_at)
    VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?)
`);
const customers = [];
for (let i = 0; i < 50; i++) {
    const isB2B = randomBoolean(0.7);
    const city = randomEl(cities);
    const stateInfo = stateMap[city];
    const name = isB2B ? generateBusinessName(generateName()) : generateName();
    const phone = '9' + Math.floor(Math.random() * 900000000 + 100000000).toString();
    const gstin = isB2B ? generateGSTIN(stateInfo.code) : null;
    const createdAt = getRandomTimestamp();

    const info = insertCustomer.run(
        name, phone, gstin, stateInfo.state, stateInfo.code, isB2B ? 'B2B' : 'B2C', createdAt
    );
    customers.push({ id: info.lastInsertRowid, name, stateCode: stateInfo.code, gstin });
}

// --- 5. SEEDING VENDORS ---
console.log('Seeding Vendors...');
const insertVendor = db.prepare(`
    INSERT INTO vendors (name, contact, material_supplied, city, gst_no, state, state_code, vendor_type, balance, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
`);
const vendors = [];
const vendorNames = [
    {n: 'Vishal Dye Works', t: 'Dyeing Work Vendor', m: 'Dyeing Process'},
    {n: 'Raj Embroidery', t: 'Embroidery Work Vendor', m: 'Embroidery Services'},
    {n: 'Surat Color Process', t: 'Dyeing Work Vendor', m: 'Dyeing and Printing'},
    {n: 'Mahavir Textile Jobs', t: 'Embroidery Work Vendor', m: 'Job Work'},
    {n: 'Shree Embroidery Works', t: 'Embroidery Work Vendor', m: 'Embroidery'},
    {n: 'Krishna Mills', t: 'Fabric Supplier', m: 'Grey Fabric'},
    {n: 'Balaji Textiles', t: 'Fabric Supplier', m: 'Yarn & Grey'},
    {n: 'Shiv Shakti Dyers', t: 'Dyeing Work Vendor', m: 'Dyeing'},
    {n: 'A1 Embroidery', t: 'Embroidery Work Vendor', m: 'Computer Embroidery'},
    {n: 'Om Fabrics', t: 'Fabric Supplier', m: 'Raw Silk'}
];

for (let v of vendorNames) {
    const city = randomEl(cities);
    const stateInfo = stateMap[city];
    const phone = '9' + Math.floor(Math.random() * 900000000 + 100000000).toString();
    const gstin = randomBoolean(0.8) ? generateGSTIN(stateInfo.code) : null;
    
    const info = insertVendor.run(
        v.n, phone, v.m, city, gstin, stateInfo.state, stateInfo.code, v.t, startTs
    );
    vendors.push({ id: info.lastInsertRowid, name: v.n, type: v.t, gstin, stateCode: stateInfo.code });
}
const embroideryVendors = vendors.filter(v => v.type.includes('Embroidery'));
const dyeingVendors = vendors.filter(v => v.type.includes('Dyeing'));

// --- 6. SEEDING CATALOG ---
console.log('Seeding Catalog...');
const insertDesign = db.prepare(`
    INSERT INTO designs (name, category, price_per_meter, available, created_at)
    VALUES (?, ?, ?, ?, ?)
`);
const catalog = [];
for (let i = 0; i < 40; i++) {
    const base = randomEl(fabrics);
    const varName = `${base.name} - V${i+1}`;
    const price = base.basePrice + randomInt(-20, 50);
    const info = insertDesign.run(varName, base.cat, price, 1, startTs);
    catalog.push({ id: info.lastInsertRowid, name: varName, price, gst: base.gst });
}

// --- 7. SEEDING ORDERS & LIFECYCLE ---
console.log('Seeding Orders & Lifecycle...');
const insertOrder = db.prepare(`
    INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, order_number, created_at, approved_at, completed_at, order_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertInvoice = db.prepare(`
    INSERT INTO invoices (invoice_number, order_id, customer_id, amount, amount_paid, status, gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount, taxable_amount, gst_type, generated_at, due_date, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertPayment = db.prepare(`
    INSERT INTO payments (invoice_id, customer_id, amount, method, reference_number, payment_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertJobCost = db.prepare(`
    INSERT INTO order_job_costs (order_id, type, vendor_id, metres, rate_per_metre, total_cost, date, payment_mode, reference, status, has_gst, gst_rate, gst_amount, taxable_amount, gst_type, itc_claimed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertVendorPayment = db.prepare(`
    INSERT INTO vendor_payments (vendor_id, vendor_name, vendor_phone, order_id, order_number, work_type, total_amount, amount_paid, balance, due_date, status, linked_job_cost_id, has_gst, gst_rate, gst_amount, taxable_amount, gst_type, itc_claimed, itc_claimed_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertExpense = db.prepare(`
    INSERT INTO expenses (category, amount, date, description, paymentMode, reference, isAuto, linkedId, type, customerName, isPending, has_gst, supplier_gstin, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed, itc_claimed_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertActivity = db.prepare(`
    INSERT INTO activity (customer_id, type, title, created_at) VALUES (?, ?, ?, ?)
`);

let invoiceCounter = 1001;

for (let i = 0; i < 350; i++) {
    const cust = randomEl(customers);
    const design = randomEl(catalog);
    
    const qty = randomInt(50, 5000);
    const priceInclusive = qty * design.price;
    const orderTs = getRandomTimestamp();
    const orderNum = `ORD-${orderTs.toString().slice(-6)}-${i}`;
    const orderDateObj = new Date(orderTs * 1000);
    const is2025 = orderDateObj.getFullYear() === 2025;
    
    // Status mix
    let status = 'pending';
    if (is2025) {
        status = 'invoiced'; // Force invoiced for 2025
    } else {
        const r = Math.random();
        if (r > 0.1) status = 'approved';
        if (r > 0.2) status = 'ready';
        if (r > 0.4) status = 'delivered';
        if (r > 0.5) status = 'completed';
        if (r > 0.7) status = 'invoiced';
    }

    const approvedTs = status !== 'pending' ? orderTs + randomInt(86400, 86400*2) : null;
    const completedTs = ['delivered', 'completed', 'invoiced'].includes(status) ? orderTs + randomInt(86400*3, 86400*15) : null;

    const orderInfo = insertOrder.run(
        cust.id, design.id, qty, priceInclusive, status, orderNum, orderTs, approvedTs, completedTs, orderTs
    );
    const orderId = orderInfo.lastInsertRowid;

    insertActivity.run(cust.id, 'order_created', `Order #${orderNum} created`, orderTs);
    if (approvedTs) insertActivity.run(cust.id, 'order_approved', `Order #${orderNum} approved`, approvedTs);

    // Job Costs
    let totalJobCost = 0;
    const willDoJobCost = is2025 ? true : (randomBoolean(0.7) && approvedTs);
    
    if (willDoJobCost && approvedTs) { 
        const hasEmb = is2025 ? true : randomBoolean(0.6); // Force embroidery for 2025
        const hasDye = is2025 ? true : randomBoolean(0.5); // Force dyeing for 2025

        const addJobCost = (vendorPool, type, rateRange) => {
            const v = randomEl(vendorPool);
            const rate = randomInt(rateRange[0], rateRange[1]);
            const cost = qty * rate;
            const ts = approvedTs + randomInt(3600, 86400);
            
            // Calculate GST for vendor
            const hasGst = v.gstin ? 1 : 0;
            const gstRate = hasGst ? 5 : 0;
            const gstCalc = calculateGST(cost, gstRate, v.stateCode);
            
            const vStatus = (is2025 || randomBoolean(0.6)) ? 'paid' : 'unpaid';
            const itcClaimed = (hasGst && vStatus === 'paid') ? 1 : 0;
            const itcDate = itcClaimed ? ts + 86400 : null;

            const jcInfo = insertJobCost.run(
                orderId, type, v.id, qty, rate, cost, new Date(ts*1000).toISOString().split('T')[0], 'Bank Transfer', `REF-${Math.floor(Math.random()*10000)}`, vStatus,
                hasGst, gstRate, gstCalc.gstAmount, gstCalc.taxableAmount, gstCalc.gstType, itcClaimed, ts
            );
            
            const jcId = jcInfo.lastInsertRowid;
            const dueDateStr = new Date((ts + 86400*30)*1000).toISOString().split('T')[0];

            insertVendorPayment.run(
                v.id, v.name, '9999999999', orderId, orderNum, type, cost, vStatus === 'paid' ? cost : 0, vStatus === 'paid' ? 0 : cost, dueDateStr, vStatus, jcId,
                hasGst, gstRate, gstCalc.gstAmount, gstCalc.taxableAmount, gstCalc.gstType, itcClaimed, itcDate, ts
            );

            const linkedId = `order:${orderId}:cost:${jcId}`;
            insertExpense.run(
                type === 'embroidery' ? 'Embroidery Work' : 'Dyeing Work', cost, ts, `${type} for #${orderNum}`, 'Bank Transfer', `REF-${Math.floor(Math.random()*1000)}`, 1, linkedId, 'out', v.name, vStatus === 'paid' ? 0 : 1,
                hasGst, v.gstin, gstCalc.taxableAmount, gstRate, gstCalc.gstAmount, gstCalc.gstType, itcClaimed, itcDate, ts
            );
            
            totalJobCost += cost;
            insertActivity.run(cust.id, 'production_update', `${type.charAt(0).toUpperCase() + type.slice(1)} work started at ${v.name}`, ts);
        };

        if (hasEmb) addJobCost(embroideryVendors, 'embroidery', [15, 45]);
        if (hasDye) addJobCost(dyeingVendors, 'dyeing', [10, 25]);
    }

    if (completedTs) {
        insertActivity.run(cust.id, 'order_completed', `Order #${orderNum} completed`, completedTs);
    }

    // Invoicing
    if (status === 'invoiced' && completedTs) {
        const invDate = new Date(completedTs * 1000);
        const invStr = `INV-${invDate.getFullYear()}-${invoiceCounter++}`;
        
        // Calculate Output GST
        const gstCalc = calculateGST(priceInclusive, design.gst, cust.stateCode);
        
        let invStatus = 'unpaid';
        let amtPaid = 0;
        
        if (is2025) {
            invStatus = 'paid';
            amtPaid = priceInclusive;
        } else {
            const r2 = Math.random();
            if (r2 > 0.4) { invStatus = 'paid'; amtPaid = priceInclusive; }
            else if (r2 > 0.2) { invStatus = 'partial'; amtPaid = parseFloat((priceInclusive * 0.5).toFixed(2)); }
        }

        const dueDateTs = completedTs + 86400*30;
        if (invStatus === 'unpaid' && (dueDateTs < (Date.now()/1000))) {
            invStatus = 'overdue';
        }

        const paidAt = invStatus === 'paid' ? completedTs + randomInt(86400, 86400*15) : null;

        const invInfo = insertInvoice.run(
            invStr, orderId, cust.id, priceInclusive, amtPaid, invStatus, design.gst, gstCalc.gstAmount, gstCalc.cgstAmount, gstCalc.sgstAmount, gstCalc.igstAmount, gstCalc.taxableAmount, gstCalc.gstType, completedTs, dueDateTs, paidAt
        );

        insertActivity.run(cust.id, 'invoice_generated', `Invoice ${invStr} generated for ₹${priceInclusive.toLocaleString('en-IN')}`, completedTs);

        if (amtPaid > 0) {
            insertPayment.run(invInfo.lastInsertRowid, cust.id, amtPaid, 'Bank Transfer', `TXN-${Math.floor(Math.random()*100000)}`, paidAt || completedTs, 'Auto generated payment');
            insertActivity.run(cust.id, 'payment_received', `Payment of ₹${amtPaid.toLocaleString('en-IN')} received`, paidAt || completedTs);
            
            // Add Cash IN to Expenses
            insertExpense.run(
                'Payment Received', amtPaid, paidAt || completedTs, `Payment against ${invStr}`, 'Bank Transfer', `TXN-${Math.floor(Math.random()*100000)}`, 1, `invoice:${invInfo.lastInsertRowid}`, 'in', cust.name, 0,
                0, null, 0, 0, 0, 'NONE', 0, null, paidAt || completedTs
            );
        }
    }
}

// --- 8. SEEDING STAFF SALARIES ---
console.log('Seeding Staff Salaries...');
const insertSalary = db.prepare(`
    INSERT INTO salaries (employee_id, month, working_days, present_days, absent_days, half_days, overtime_hours, basic_earned, overtime_pay, deductions, advance_recovery, net_payable, status, payment_method, reference_number, payment_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (let year = 2025; year <= 2026; year++) {
    const maxMonth = year === 2026 ? 5 : 12;
    for (let month = 1; month <= maxMonth; month++) {
        const mStr = `${year}-${String(month).padStart(2, '0')}`;
        const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59));
        const ts = Math.floor(lastDay.getTime() / 1000);
        const dateStr = lastDay.toISOString().split('T')[0];
        
        for (const emp of employees) {
            const ref = `SAL-${year}${String(month).padStart(2, '0')}-${emp.id}`;
            insertSalary.run(
                emp.id, mStr, 26, 26, 0, 0, 0, emp.salary, 0, 0, 0, emp.salary, 
                'paid', 'Bank Transfer', ref, dateStr, ts
            );
            
            // Salary expense in Cash Book
            insertExpense.run(
                'Salary', emp.salary, ts, `Salary for ${mStr} - ${emp.name}`, 'Bank Transfer', ref, 1, `salary:${mStr}:${emp.id}`, 'out', emp.name, 0,
                0, null, 0, 0, 0, 'NONE', 0, null, ts
            );
        }
    }
}

console.log('✅ Seeding completed! Database is fully populated.');
