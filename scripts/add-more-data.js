const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

async function addMoreData() {
    console.log('Adding more customers and orders...');

    const customerPassword = await bcrypt.hash('customer123', 10);
    const userInsert = db.prepare(`
        INSERT INTO users (phone, password_hash, name, role)
        VALUES (?, ?, ?, ?)
    `);

    const customerInsert = db.prepare(`
        INSERT INTO customers (user_id, name, phone)
        VALUES (?, ?, ?)
    `);

    const newCustomers = [
        { name: 'Suresh Raina', phone: '+919999999901' },
        { name: 'Deepika Padukone', phone: '+919999999902' },
        { name: 'Virat Kohli', phone: '+919999999903' },
        { name: 'Anushka Sharma', phone: '+919999999904' },
        { name: 'Mahendra Singh', phone: '+919999999905' },
    ];

    const customerIds = [];

    for (const c of newCustomers) {
        try {
            const res = userInsert.run(c.phone, customerPassword, c.name, 'customer');
            const userId = res.lastInsertRowid;
            const custRes = customerInsert.run(userId, c.name, c.phone);
            customerIds.push(custRes.lastInsertRowid);
            console.log(`✓ Added customer: ${c.name}`);
        } catch (e) {
            console.log(`! Customer ${c.name} might already exist: ${e.message}`);
            const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(c.phone);
            if (existing) customerIds.push(existing.id);
        }
    }

    // Get available designs
    const designs = db.prepare('SELECT id, price_per_meter FROM designs').all();
    if (designs.length === 0) {
        console.log('No designs found. Please run seed script first.');
        return;
    }

    const orderInsert = db.prepare(`
        INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 86400;
    const statuses = ['pending', 'approved', 'completed', 'invoiced'];

    console.log('Adding 15 new orders...');
    for (let i = 0; i < 15; i++) {
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const design = designs[Math.floor(Math.random() * designs.length)];
        const quantity = Math.floor(Math.random() * 100) + 10;
        const totalPrice = quantity * design.price_per_meter;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const createdAt = now - Math.floor(Math.random() * 30 * dayInSeconds); // Last 30 days

        orderInsert.run(customerId, design.id, quantity, totalPrice, status, createdAt);
    }

    console.log('✓ Added 15 random orders spread across the last 30 days.');
    db.close();
    console.log('Done!');
}

addMoreData().catch(console.error);
