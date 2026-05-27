import { getDatabase } from '../lib/db/index';

async function runMigration() {
    console.log('Migrating vendor_payments table in Postgres...');
    const db = getDatabase();

    try {
        await db.prepare(`ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS dispatch_id INTEGER REFERENCES dispatch_batches(id) ON DELETE SET NULL;`).run();
        console.log('Added dispatch_id');
    } catch (e: any) {
        console.log('Notice:', e.message);
    }

    try {
        await db.prepare(`ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_vendor_bill';`).run();
        console.log('Added source');
    } catch (e: any) {
        console.log('Notice:', e.message);
    }

    try {
        await db.prepare(`ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;`).run();
        console.log('Added is_deleted');
    } catch (e: any) {
        console.log('Notice:', e.message);
    }

    // Try dropping check constraints. Postgres usually names them like vendor_payments_work_type_check
    try {
        await db.prepare(`ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_work_type_check;`).run();
        console.log('Dropped work_type_check');
    } catch (e: any) {
        console.log('Notice:', e.message);
    }

    try {
        await db.prepare(`ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_status_check;`).run();
        console.log('Dropped status_check');
    } catch (e: any) {
        console.log('Notice:', e.message);
    }

    console.log('Migration successful!');
    process.exit(0);
}

runMigration().catch(e => {
    console.error('Migration failed', e);
    process.exit(1);
});
