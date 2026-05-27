import { pool } from './lib/db/index.js';

async function migrate() {
    console.log('Starting DB migration for vendor_payments...');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        await client.query(`
            ALTER TABLE vendor_payments 
            ADD COLUMN IF NOT EXISTS dispatch_id INTEGER REFERENCES dispatch_batches(id) ON DELETE SET NULL;
        `);
        console.log('Added dispatch_id to vendor_payments table.');

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
