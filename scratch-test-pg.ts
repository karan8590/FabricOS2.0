import getDatabase from './lib/db/index';

async function checkDb() {
    const db = getDatabase();
    try {
        const rows = await db.prepare("SELECT * FROM settings").all();
        console.log('All settings:', rows);
    } catch (e) {
        console.error('Error:', e);
    }
}
checkDb();
