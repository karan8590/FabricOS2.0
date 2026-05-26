import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(process.cwd(), '.env.local') });

async function runMigration() {
    if (!process.env.POSTGRES_URL) {
        console.error('Missing POSTGRES_URL');
        process.exit(1);
    }
    
    console.log('Running migration...');
    const sql = postgres(process.env.POSTGRES_URL, {
        ssl: 'require',
        max: 1
    });

    try {
        await sql`BEGIN`;

        console.log('Adding current_stage to orders...');
        await sql`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS current_stage TEXT NOT NULL DEFAULT 'approved'
        `;

        console.log('Creating order_stage_history table...');
        await sql`
            CREATE TABLE IF NOT EXISTS order_stage_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id TEXT DEFAULT 'business_001',
                order_id INTEGER NOT NULL,
                from_stage TEXT,
                to_stage TEXT NOT NULL,
                changed_by INTEGER,
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `;
        
        console.log('Creating index for order_stage_history...');
        await sql`
            CREATE INDEX IF NOT EXISTS idx_order_stage_history_order_id ON order_stage_history(order_id)
        `;

        await sql`COMMIT`;
        console.log('Migration completed successfully.');
    } catch (err) {
        await sql`ROLLBACK`;
        console.error('Migration failed:', err);
    } finally {
        await sql.end();
    }
}

runMigration();
