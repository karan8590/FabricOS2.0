const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

async function addEvenMoreOrders() {
    console.log('Adding more variety to orders...');

    const customers = db.prepare('SELECT id FROM customers').all();
    const designs = db.prepare('SELECT id, price_per_meter FROM designs').all();

    if (customers.length === 0 || designs.length === 0) {
        console.log('Customers or designs missing.');
        return;
    }

    const orderInsert = db.prepare(`
        INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 86400;
    const statuses = ['pending', 'approved', 'completed', 'invoiced'];

    console.log('Adding 20 more orders for various customers...');
    for (let i = 0; i < 20; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const design = designs[Math.floor(Math.random() * designs.length)];
        const quantity = Math.floor(Math.random() * 80) + 5;
        const totalPrice = quantity * design.price_per_meter;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const createdAt = now - Math.floor(Math.random() * 60 * dayInSeconds); // Last 60 days

        orderInsert.run(customer.id, design.id, quantity, totalPrice, status, createdAt);
    }

    console.log('✓ Added 20 more orders.');
    db.close();
}

addEvenMoreOrders().catch(console.error);
