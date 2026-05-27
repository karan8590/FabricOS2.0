import { config } from 'dotenv';
config({ path: '.env.local' });
import getDatabase from './lib/db';
async function run() {
    try {
        const db = getDatabase();
        await db.query('ALTER TABLE catalog_designs ADD COLUMN IF NOT EXISTS master_sheet_url TEXT');
        console.log('Schema updated successfully.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
