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
            CREATE TABLE IF NOT EXISTS dispatch_challans (
              id SERIAL PRIMARY KEY,
              business_id TEXT DEFAULT 'business_001',
              challan_number TEXT NOT NULL UNIQUE,
              dispatch_id INTEGER NOT NULL,
              customer_id INTEGER NOT NULL,
              order_ids TEXT NOT NULL,
              telegram_sent INTEGER DEFAULT 0,
              created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
            );
        `);
        console.log("Schema applied successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();
