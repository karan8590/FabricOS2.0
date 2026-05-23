const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

try {
    console.log('Testing queries...');
    
    console.log('1. Orders Received');
    db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at <= ?').get(0, 2000000000);
    
    console.log('2. Orders Delivered');
    db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('completed', 'invoiced') AND completed_at >= ? AND completed_at <= ?").get(0, 2000000000);
    
    console.log('3. Revenue Collected');
    db.prepare("SELECT COALESCE(SUM(amount), 0) as revenue FROM invoices WHERE status = 'paid' AND paid_at >= ? AND paid_at <= ?").get(0, 2000000000);
    
    console.log('4. Outstanding Amount');
    db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status IN ('unpaid', 'overdue')").get();
    
    console.log('7. Analytics');
    db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'paid' AND paid_at >= ? AND paid_at <= ?").get(0, 2000000000);
    
    console.log('8. Recent Deliveries');
    db.prepare(`
        SELECT o.id, c.name as customer, d.name as design, o.status, o.completed_at as date
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN designs d ON o.design_id = d.id
        WHERE o.status IN ('completed', 'invoiced')
        ORDER BY o.completed_at DESC
        LIMIT 5
    `).all();

    console.log('9. Top Customers');
    db.prepare(`
        SELECT c.id, c.name, COALESCE(SUM(i.amount), 0) as revenue
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.status = 'paid'
        GROUP BY c.id
        ORDER BY revenue DESC
        LIMIT 5
    `).all();

    console.log('10. Low Stock');
    db.prepare(`
        SELECT id, name, stock_quantity as remaining
        FROM designs
        WHERE stock_quantity < 20
        LIMIT 5
    `).all();

    console.log('11. Upcoming Deliveries');
    db.prepare(`
        SELECT o.id, c.name as customer, d.name as design, o.quantity_meters as quantity, o.created_at as date, o.status
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN designs d ON o.design_id = d.id
        WHERE o.status IN ('pending', 'approved')
        ORDER BY o.created_at ASC
        LIMIT 8
    `).all();

    console.log('All queries passed!');
} catch (e) {
    console.error('FAILED:', e.message);
} finally {
    db.close();
}
