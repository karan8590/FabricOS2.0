import { pool } from './lib/db/index.js';

async function migrate() {
    console.log('Starting DB migration for delivery address fields...');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Add to customers
        await client.query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS billing_address TEXT,
            ADD COLUMN IF NOT EXISTS shipping_address TEXT,
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS pincode TEXT;
        `);
        console.log('Added address columns to customers table.');

        // Add to orders
        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS delivery_address TEXT;
        `);
        console.log('Added delivery_address column to orders table.');

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
