require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS queued_vendor_id INTEGER;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS queued_rate NUMERIC;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS queued_expected_date TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS queued_notes TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS queued_generate_challan BOOLEAN DEFAULT TRUE;');
    console.log('Columns added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
