const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

function fixSchema() {
    console.log('Fixing database schema...');

    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
        // 1. Fix orders table
        console.log('Fixing orders table...');
        db.prepare('ALTER TABLE orders RENAME TO orders_old').run();
        db.prepare(`
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                design_id INTEGER NOT NULL,
                quantity_meters REAL NOT NULL,
                total_price REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'completed', 'invoiced')),
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                approved_at INTEGER,
                completed_at INTEGER,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE RESTRICT
            )
        `).run();
        db.prepare(`
            INSERT INTO orders (id, customer_id, design_id, quantity_meters, total_price, status, created_at, approved_at, completed_at)
            SELECT id, customer_id, design_id, quantity_meters, total_price, status, created_at, approved_at, completed_at FROM orders_old
        `).run();
        db.prepare('DROP TABLE orders_old').run();

        // 2. Fix invoices table
        console.log('Fixing invoices table...');
        db.prepare('ALTER TABLE invoices RENAME TO invoices_old').run();
        db.prepare(`
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
        `).run();
        db.prepare(`
            INSERT INTO invoices (id, invoice_number, order_id, customer_id, amount, amount_paid, status, generated_at, due_date, paid_at, last_payment_date)
            SELECT id, invoice_number, order_id, customer_id, amount, amount_paid, status, generated_at, due_date, paid_at, last_payment_date FROM invoices_old
        `).run();
        db.prepare('DROP TABLE invoices_old').run();
    })();

    console.log('Schema fixed successfully!');
    db.close();
}

fixSchema();
