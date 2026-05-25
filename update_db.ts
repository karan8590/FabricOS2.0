import { pool } from './lib/db/index';
async function run() {
  try {
    await pool.query('ALTER TABLE inventory_fabric ADD COLUMN IF NOT EXISTS fabric_type VARCHAR(50);');
    await pool.query('ALTER TABLE inventory_fabric ALTER COLUMN design_name DROP NOT NULL;');
    await pool.query('ALTER TABLE inventory_fabric ALTER COLUMN metres_received DROP NOT NULL;');
    console.log('DB updated successfully!');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
