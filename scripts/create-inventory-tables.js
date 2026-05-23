const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Running inventory schema migrations...');

try {
    // Add custom fields to vendors
    try {
        db.exec('ALTER TABLE vendors ADD COLUMN city TEXT;');
        console.log('✓ Added city column to vendors');
    } catch (e) {
        console.log('city column already exists in vendors or error:', e.message);
    }

    try {
        db.exec('ALTER TABLE vendors ADD COLUMN gst_no TEXT;');
        console.log('✓ Added gst_no column to vendors');
    } catch (e) {
        console.log('gst_no column already exists in vendors or error:', e.message);
    }

    // Create inventory_fabric table
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_fabric (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            design_name TEXT NOT NULL,
            vendor_id INTEGER NOT NULL,
            metres_ordered REAL NOT NULL,
            metres_received REAL NOT NULL,
            metres_used REAL NOT NULL DEFAULT 0,
            balance REAL NOT NULL,
            purchase_cost REAL NOT NULL,
            rate_per_metre REAL NOT NULL,
            linked_order_no TEXT,
            purchase_date TEXT NOT NULL,
            invoice_no TEXT,
            notes TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
        );
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_fabric_vendor ON inventory_fabric(vendor_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_fabric_date ON inventory_fabric(purchase_date);');
    console.log('✓ Provisioned inventory_fabric table and indexes');

    // Create inventory_ink table
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_ink (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ink_colour TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL CHECK(unit IN ('L', 'kg')),
            supplier TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            cost_per_unit REAL NOT NULL,
            current_balance REAL NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_ink_date ON inventory_ink(purchase_date);');
    console.log('✓ Provisioned inventory_ink table and indexes');

    // Create inventory_packaging table
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_packaging (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('Roll', 'Cover', 'Tag')),
            quantity REAL NOT NULL,
            supplier TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            cost REAL NOT NULL,
            current_stock REAL NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_packaging_date ON inventory_packaging(purchase_date);');
    console.log('✓ Provisioned inventory_packaging table and indexes');

    console.log('✅ Inventory schema migration finished successfully!');
} catch (error) {
    console.error('❌ Failed to run migrations:', error);
} finally {
    db.close();
}
