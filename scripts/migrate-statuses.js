const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'fabricos.db');
if (!fs.existsSync(dbPath)) {
    console.error('Database file not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

console.log('Starting order status migration for local SQLite database...');

const orders = db.prepare('SELECT id, status FROM orders').all();
let migratedCount = 0;

const updateStmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');

db.transaction(() => {
    for (const order of orders) {
        const oldStatus = order.status ? order.status.toLowerCase() : '';
        let newStatus = '';
        
        if (oldStatus === 'pending' || oldStatus === 'waiting_approval') {
            newStatus = 'created';
        } else if (oldStatus === 'approved' || oldStatus === 'in_production' || oldStatus === 'embroidery_in_progress' || oldStatus === 'printing_in_factory' || oldStatus === 'dyeing_in_progress') {
            newStatus = 'approved';
        } else if (oldStatus === 'ready' || oldStatus === 'ready_for_delivery') {
            newStatus = 'ready';
        } else if (oldStatus === 'dispatched' || oldStatus === 'shipped') {
            newStatus = 'dispatched';
        } else if (oldStatus === 'delivered' || oldStatus === 'completed' || oldStatus === 'invoiced') {
            newStatus = 'delivered';
        } else if (oldStatus === 'cancelled') {
            newStatus = 'cancelled';
        } else if (oldStatus === 'created' || oldStatus === 'embroidery' || oldStatus === 'printing' || oldStatus === 'dyeing') {
            newStatus = oldStatus;
        }
        
        if (newStatus && newStatus !== order.status) {
            updateStmt.run(newStatus, order.id);
            migratedCount++;
        }
    }
})();

console.log(`Migration complete. Updated ${migratedCount} orders.`);
process.exit(0);
