const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'fabricos.db');
const db = new Database(dbPath);

const customers = [1, 2, 3, 4, 5];
const designs = [1, 2, 3, 4, 5];

// Current month timestamps
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const startTs = Math.floor(startOfMonth.getTime() / 1000);
const endTs = Math.floor(endOfMonth.getTime() / 1000);

const addOrder = (customerId, designId, status) => {
    const quantity = Math.floor(Math.random() * 50) + 10;
    const design = db.prepare('SELECT price_per_meter FROM designs WHERE id = ?').get(designId);
    const totalPrice = design.price_per_meter * quantity;
    
    // Random date this month
    const createdAt = Math.floor(Math.random() * (endTs - startTs)) + startTs;
    
    db.prepare(`
        INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(customerId, designId, quantity, totalPrice, status, createdAt);
    
    db.prepare('UPDATE customers SET total_orders = total_orders + 1 WHERE id = ?').run(customerId);
};

// Add 5 approved orders (In Production)
for (let i = 0; i < 5; i++) {
    const c = customers[Math.floor(Math.random() * customers.length)];
    const d = designs[Math.floor(Math.random() * designs.length)];
    addOrder(c, d, 'approved');
}

// Add 3 pending orders (Waiting Approval)
for (let i = 0; i < 3; i++) {
    const c = customers[Math.floor(Math.random() * customers.length)];
    const d = designs[Math.floor(Math.random() * designs.length)];
    addOrder(c, d, 'pending');
}

console.log('Successfully added more orders for this month.');
db.close();
