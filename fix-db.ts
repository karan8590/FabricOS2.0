import getDatabase from './lib/db';

async function migrate() {
  const db = getDatabase();
  try {
    console.log("Running migration...");
    db.prepare(`
      ALTER TABLE dispatch_batches
      ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS transport_vendor_id INTEGER,
      ADD COLUMN IF NOT EXISTS driver_name TEXT,
      ADD COLUMN IF NOT EXISTS driver_phone TEXT,
      ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
      ADD COLUMN IF NOT EXISTS route_area TEXT;
    `).run();
    console.log("Migration completed.");
  } catch(e) {
    console.error("Migration failed:", e);
  }
}
migrate();
