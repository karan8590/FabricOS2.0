import getDatabase from '../lib/db';
async function run() {
    const db = getDatabase();
    const orders = await db.prepare('SELECT status, count(*) as count FROM orders WHERE business_id = ? GROUP BY status').all('business_001');
    console.log('Orders by status:', orders);
    const dispatches = await db.prepare('SELECT count(*) as count FROM dispatches WHERE business_id = ?').get('business_001');
    console.log('Dispatches count:', dispatches);
    const recentOrders = await db.prepare('SELECT id, status FROM orders WHERE business_id = ? ORDER BY created_at DESC LIMIT 5').all('business_001');
    console.log('Recent orders:', recentOrders);
}
run().catch(console.error);
