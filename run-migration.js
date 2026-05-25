const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const sql = `
CREATE TABLE IF NOT EXISTS inventory_materials (
    id SERIAL PRIMARY KEY,
    business_id TEXT DEFAULT 'business_001',
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    vendor_id INTEGER NOT NULL,
    color TEXT,
    gsm TEXT,
    unit TEXT NOT NULL,
    available_stock NUMERIC NOT NULL DEFAULT 0,
    reserved_stock NUMERIC NOT NULL DEFAULT 0,
    used_stock NUMERIC NOT NULL DEFAULT 0,
    rate_per_unit NUMERIC NOT NULL DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    last_purchase_date TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_history (
    id SERIAL PRIMARY KEY,
    business_id TEXT DEFAULT 'business_001',
    material_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    prev_stock NUMERIC NOT NULL,
    new_stock NUMERIC NOT NULL,
    reason TEXT,
    linked_order_id INTEGER,
    vendor_id INTEGER,
    user_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
    FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inv_materials_biz ON inventory_materials(business_id);
CREATE INDEX IF NOT EXISTS idx_inv_materials_vendor ON inventory_materials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inv_history_mat ON inventory_history(material_id);
CREATE INDEX IF NOT EXISTS idx_inv_history_biz ON inventory_history(business_id);
`;

pool.query(sql)
    .then(res => { console.log('Migration successful'); process.exit(0); })
    .catch(err => { console.error('Migration failed:', err); process.exit(1); });
