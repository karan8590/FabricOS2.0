const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    await pool.query(`
      ALTER TABLE dispatch_batches
      ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS transport_vendor_id INTEGER,
      ADD COLUMN IF NOT EXISTS driver_name TEXT,
      ADD COLUMN IF NOT EXISTS driver_phone TEXT,
      ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
      ADD COLUMN IF NOT EXISTS route_area TEXT;
    `);
    console.log("Migration successful");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
