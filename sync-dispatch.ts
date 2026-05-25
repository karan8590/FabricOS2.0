import fs from 'fs';
import path from 'path';

const envData = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
envData.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        process.env[match[1]] = match[2];
    }
});

async function run() {
    const { default: getDatabase } = await import('./lib/db/index.ts');
    const db = getDatabase();
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS dispatch_batches (
              id SERIAL PRIMARY KEY,
              business_id TEXT DEFAULT 'business_001',
              dispatch_number TEXT NOT NULL UNIQUE,
              vehicle_number TEXT,
              driver_name TEXT,
              driver_phone TEXT,
              route TEXT,
              dispatch_date TEXT,
              notes TEXT,
              status TEXT,
              transport_vendor_id INTEGER,
              created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
            );
            
            CREATE TABLE IF NOT EXISTS dispatch_orders (
              id SERIAL PRIMARY KEY,
              business_id TEXT DEFAULT 'business_001',
              dispatch_id INTEGER NOT NULL,
              order_id INTEGER NOT NULL,
              delivery_status TEXT,
              created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
              FOREIGN KEY (dispatch_id) REFERENCES dispatch_batches(id) ON DELETE CASCADE,
              FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            );
        `);
        console.log("Dispatch schema applied successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();
