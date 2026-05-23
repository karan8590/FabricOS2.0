import getDatabase from './lib/db/index';

async function migrate() {
    const db = getDatabase();
    
    try {
        console.log('Adding columns to inventory_ink...');
        await db.prepare(`ALTER TABLE inventory_ink ADD COLUMN min_stock NUMERIC DEFAULT 0`).run();
    } catch (e: any) { console.log('inventory_ink min_stock exists or error:', e.message); }
    
    try {
        await db.prepare(`ALTER TABLE inventory_ink ADD COLUMN last_alert_sent INTEGER`).run();
    } catch (e: any) { console.log('inventory_ink last_alert_sent exists or error:', e.message); }

    try {
        console.log('Adding columns to inventory_packaging...');
        await db.prepare(`ALTER TABLE inventory_packaging ADD COLUMN min_stock NUMERIC DEFAULT 0`).run();
    } catch (e: any) { console.log('inventory_packaging min_stock exists or error:', e.message); }
    
    try {
        await db.prepare(`ALTER TABLE inventory_packaging ADD COLUMN last_alert_sent INTEGER`).run();
    } catch (e: any) { console.log('inventory_packaging last_alert_sent exists or error:', e.message); }

    try {
        console.log('Adding column to orders...');
        await db.prepare(`ALTER TABLE orders ADD COLUMN qr_code TEXT`).run();
    } catch (e: any) { console.log('orders qr_code exists or error:', e.message); }

    try {
        console.log('Creating samples table...');
        await db.prepare(`
        CREATE TABLE IF NOT EXISTS samples (
            business_id TEXT DEFAULT 'business_001',
            id SERIAL PRIMARY KEY,
            sample_number TEXT UNIQUE,
            customer_id INTEGER,
            design_id INTEGER,
            shade TEXT,
            metres NUMERIC,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'converted', 'rejected', 'expired')),
            date_sent INTEGER,
            follow_up_date INTEGER,
            delivery_method TEXT,
            tracking_number TEXT,
            notes TEXT,
            linked_challan_id INTEGER,
            linked_order_id INTEGER,
            conversion_date INTEGER,
            created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
        )`).run();
        await db.prepare(`CREATE INDEX IF NOT EXISTS idx_samples_customer ON samples(customer_id)`).run();
        console.log('Samples table created.');
    } catch (e: any) { console.log('samples table error:', e.message); }

    console.log('Migration complete.');
}

migrate();
