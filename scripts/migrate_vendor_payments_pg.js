const { Client } = require('pg');

async function runMigration() {
    console.log('Migrating vendor_payments table in Postgres...');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        try {
            await client.query(`ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS dispatch_id INTEGER REFERENCES dispatch_batches(id) ON DELETE SET NULL;`);
            console.log('Added dispatch_id');
        } catch (e) {
            console.log('Notice:', e.message);
        }

        try {
            await client.query(`ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_vendor_bill';`);
            console.log('Added source');
        } catch (e) {
            console.log('Notice:', e.message);
        }

        try {
            await client.query(`ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;`);
            console.log('Added is_deleted');
        } catch (e) {
            console.log('Notice:', e.message);
        }

        try {
            await client.query(`ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_work_type_check;`);
            console.log('Dropped work_type_check');
        } catch (e) {
            console.log('Notice:', e.message);
        }

        try {
            await client.query(`ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_status_check;`);
            console.log('Dropped status_check');
        } catch (e) {
            console.log('Notice:', e.message);
        }

        console.log('Migration successful!');
    } catch (e) {
        console.error('Migration failed', e);
    } finally {
        await client.end();
    }
}

runMigration();
