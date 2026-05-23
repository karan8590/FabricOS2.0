const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

try {
    db.transaction(() => {
        // Delete in order to satisfy foreign key constraints
        console.log('Clearing payments...');
        db.prepare('DELETE FROM payments').run();
        
        console.log('Clearing invoices...');
        db.prepare('DELETE FROM invoices').run();
        
        console.log('Clearing activity...');
        db.prepare('DELETE FROM activity').run();
        
        console.log('Clearing orders...');
        db.prepare('DELETE FROM orders').run();
        
        console.log('Clearing customers...');
        db.prepare('DELETE FROM customers').run();
        
        console.log('Clearing customer users...');
        db.prepare("DELETE FROM users WHERE role = 'customer'").run();
        
        console.log('All customer-related data cleared successfully.');
    })();
} catch (error) {
    console.error('Failed to clear customers:', error);
} finally {
    db.close();
}
