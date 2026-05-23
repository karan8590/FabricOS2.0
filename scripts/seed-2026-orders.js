const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Seeding 2026 orders...');

const orderInsert = db.prepare(`
    INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

// Dates from Jan 1, 2026 to May 20, 2026
const start = new Date('2026-01-01T00:00:00Z').getTime() / 1000;
const end = new Date('2026-05-20T23:59:59Z').getTime() / 1000;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const statuses = ['pending', 'approved', 'completed'];

for (let i = 0; i < 100; i++) { // Let's add 100 orders
    const customer_id = getRandomInt(1, 3);
    const design_id = getRandomInt(1, 5);
    const quantity_meters = getRandomInt(10, 100);
    const price_per_meter = [150, 450, 250, 550, 650][design_id - 1]; // From seed-db.js
    const total_price = quantity_meters * price_per_meter;
    const status = statuses[getRandomInt(0, 2)];
    const created_at = getRandomInt(start, end);
    
    orderInsert.run(customer_id, design_id, quantity_meters, total_price, status, created_at);
}

console.log('✓ Created 100 sample orders for 2026 (Jan to May 20)');
db.close();
