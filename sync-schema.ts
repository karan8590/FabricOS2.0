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
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS current_stage TEXT NOT NULL DEFAULT 'approved';
            
            CREATE TABLE IF NOT EXISTS order_stage_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id TEXT DEFAULT 'business_001',
                order_id INTEGER NOT NULL,
                from_stage TEXT,
                to_stage TEXT NOT NULL,
                changed_by INTEGER,
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_order_stage_history_order_id ON order_stage_history(order_id);
        `);
        console.log("Schema applied successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();
