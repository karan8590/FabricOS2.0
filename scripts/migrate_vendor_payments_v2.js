const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Migrating vendor_payments table...');

db.transaction(() => {
    // 1. Rename old table
    db.prepare('ALTER TABLE vendor_payments RENAME TO vendor_payments_old').run();

    // 2. Create new table without CHECK constraints on work_type and status, and with dispatch_id, source, is_deleted
    db.prepare(`
        CREATE TABLE vendor_payments (
            business_id TEXT DEFAULT 'business_001',
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            vendor_name TEXT NOT NULL,
            vendor_phone TEXT NOT NULL,
            order_id INTEGER,
            order_number TEXT,
            work_type TEXT NOT NULL,
            total_amount REAL NOT NULL,
            amount_paid REAL NOT NULL DEFAULT 0,
            balance REAL NOT NULL,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'unpaid',
            notes TEXT,
            linked_job_cost_id INTEGER,
            has_gst INTEGER DEFAULT 0,
            gst_rate REAL DEFAULT 0,
            gst_amount REAL DEFAULT 0,
            taxable_amount REAL DEFAULT 0,
            gst_type TEXT CHECK(gst_type IN ('CGST_SGST', 'IGST', 'NONE')) DEFAULT 'NONE',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            itc_claimed INTEGER DEFAULT 0,
            invoice_no TEXT,
            itc_amount REAL DEFAULT 0,
            itc_claimed_date INTEGER,
            dispatch_id INTEGER,
            source TEXT DEFAULT 'manual_vendor_bill',
            is_deleted INTEGER DEFAULT 0,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (dispatch_id) REFERENCES dispatch_batches(id) ON DELETE SET NULL
        )
    `).run();

    // 3. Copy data
    db.prepare(`
        INSERT INTO vendor_payments (
            business_id, id, vendor_id, vendor_name, vendor_phone, order_id, order_number,
            work_type, total_amount, amount_paid, balance, due_date, status, notes,
            linked_job_cost_id, has_gst, gst_rate, gst_amount, taxable_amount, gst_type,
            created_at, itc_claimed, invoice_no, itc_amount, itc_claimed_date
        )
        SELECT 
            business_id, id, vendor_id, vendor_name, vendor_phone, order_id, order_number,
            work_type, total_amount, amount_paid, balance, due_date, status, notes,
            linked_job_cost_id, has_gst, gst_rate, gst_amount, taxable_amount, gst_type,
            created_at, itc_claimed, invoice_no, itc_amount, itc_claimed_date
        FROM vendor_payments_old
    `).run();

    // 4. Create Indexes
    db.prepare('CREATE INDEX IF NOT EXISTS idx_vendor_payments_business ON vendor_payments(business_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_vendor_payments_due_date ON vendor_payments(due_date)').run();

    // 5. Drop old table
    db.prepare('DROP TABLE vendor_payments_old').run();

})();

console.log('Migration successful!');
