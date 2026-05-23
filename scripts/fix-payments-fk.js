const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Fixing Payments table Foreign Key...');

// Transaction to safely recreate payments table
const fixPayments = db.transaction(() => {
    // 1. Rename existing payments (to save data if any)
    db.prepare('ALTER TABLE payments RENAME TO payments_temp').run();

    // 2. Create new payments table with correct FK
    db.exec(`
        CREATE TABLE payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            date INTEGER NOT NULL,
            notes TEXT,
            method TEXT DEFAULT 'cash',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        );
    `);

    // 3. Copy data back
    db.exec(`
        INSERT INTO payments (id, invoice_id, amount, date, notes, method, created_at)
        SELECT id, invoice_id, amount, date, notes, method, created_at
        FROM payments_temp
    `);

    // 4. Drop temp table
    db.prepare('DROP TABLE payments_temp').run();
});

try {
    fixPayments();
    console.log('✓ Successfully fixed payments table Foreign Key.');
} catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
}
