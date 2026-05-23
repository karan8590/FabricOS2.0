const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Fixing invoice status constraint...');

const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'").get();
if (schema.sql.includes("'partial'")) {
    console.log('✓ Invoices table already supports partial status');
    process.exit(0);
}

// Transaction for safe schema migration
const moveData = db.transaction(() => {
    // 1. Rename existing table
    db.prepare('ALTER TABLE invoices RENAME TO invoices_old').run();

    // 2. Create new table with updated check constraint
    // Note: We also include the new columns amount_paid, last_payment_date from start
    db.exec(`
        CREATE TABLE invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            order_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            amount_paid REAL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid', 'overdue', 'partial')),
            generated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            due_date INTEGER,
            paid_at INTEGER,
            last_payment_date INTEGER,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
        )
    `);

    // 3. Copy data
    // match columns from old to new. 
    // old has: id, invoice_number, order_id, customer_id, amount, status, generated_at, due_date, paid_at.
    // old MIGHT have amount_paid and last_payment_date if previous migration added them.
    // Let's inspect columns of invoices_old to be safe, but simpler is to insert what we know.

    // We can use INSERT INTO ... SELECT ...
    // But we need to know if invoices_old has amount_paid.
    // The previous script added them if missing. So yes, they exist.

    db.exec(`
        INSERT INTO invoices (id, invoice_number, order_id, customer_id, amount, amount_paid, status, generated_at, due_date, paid_at, last_payment_date)
        SELECT id, invoice_number, order_id, customer_id, amount, amount_paid, status, generated_at, due_date, paid_at, last_payment_date
        FROM invoices_old
    `);

    // 4. Drop old table
    db.prepare('DROP TABLE invoices_old').run();

    // 5. Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
});

try {
    moveData();
    console.log('✓ Successfully updated invoices table constraint to include "partial".');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
