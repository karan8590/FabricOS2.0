require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS base_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS printing_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS embroidery_cost_charged NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dyeing_cost_charged NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS additional_charges NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;
    `);
    console.log("Migration successful.");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    process.exit(0);
  }
}
migrate();
