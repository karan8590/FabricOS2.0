const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Patching expenses for GST report...');
const businessId = 'business_001';

db.transaction(() => {
    // Clear old expenses just in case (we deleted them in the first run anyway)
    db.prepare("DELETE FROM expenses").run();

    const expenseInsert = db.prepare(`
        INSERT INTO expenses (business_id, date, amount, category, description, paymentMode, reference, addedBy, type, customerName, has_gst, supplier_gstin, invoice_no, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed, isAuto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Fetch all order_job_costs
    const jobCosts = db.prepare("SELECT * FROM order_job_costs").all();
    let expCount = 0;
    
    for (const jc of jobCosts) {
        // Fetch vendor details
        const vendor = db.prepare("SELECT name, gst_no FROM vendors WHERE id = ?").get(jc.vendor_id);
        
        const isEmbroidery = jc.type === 'embroidery';
        const invNo = isEmbroidery ? `EMB-INV-${jc.id}` : `DYE-INV-${jc.id}`;
        
        // Add to expenses
        expenseInsert.run(
            businessId,
            jc.date, // YYYY-MM-DD
            jc.total_cost + jc.gst_amount, // Total amount
            jc.type === 'embroidery' ? 'job_work_embroidery' : 'job_work_dyeing',
            `Job work for Order ${jc.order_id}`,
            jc.payment_mode,
            jc.reference,
            1, // addedBy admin
            'out',
            vendor.name,
            1, // has_gst
            vendor.gst_no,
            invNo,
            jc.total_cost, // taxable
            jc.gst_rate,
            jc.gst_amount,
            jc.gst_type,
            1, // itc_claimed
            1 // isAuto
        );
        expCount++;
    }
    console.log(`Inserted ${expCount} job work expenses.`);
})();
