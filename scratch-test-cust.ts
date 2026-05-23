import getDatabase from './lib/db/index';

async function checkCust() {
    const db = getDatabase();
    try {
        const rows = await db.prepare("SELECT * FROM customers").all();
        console.log('Customers without name:', rows.filter(r => !r.name));
    } catch (e) {
        console.error('Error:', e);
    }
}
checkCust();
