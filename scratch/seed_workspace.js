const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'fabricos.db');
const db = new Database(dbPath);

const seedWorkspace = () => {
    // 1. Get all customers
    const customers = db.prepare('SELECT id, name FROM customers').all();
    const invoices = db.prepare('SELECT id, customer_id, amount, invoice_number FROM invoices').all();

    console.log(`Seeding workspace for ${customers.length} customers...`);

    // 2. Add some payments for existing invoices
    for (const inv of invoices) {
        const numPayments = Math.floor(Math.random() * 2) + 1; // 1 or 2 payments
        for (let i = 0; i < numPayments; i++) {
            const amount = Math.floor(inv.amount / (numPayments + 1));
            const method = ['upi', 'bank_transfer', 'cash'][Math.floor(Math.random() * 3)];
            const date = Math.floor(Date.now() / 1000) - (Math.floor(Math.random() * 30) * 86400);

            db.prepare(`
                INSERT INTO payments (invoice_id, customer_id, amount, method, payment_date, reference_number)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(inv.id, inv.customer_id, amount, method, date, `PAY-${Math.floor(Math.random() * 10000)}`);
        }
    }

    // 3. Add some activity for all customers
    const activityTypes = [
        { type: 'order_created', title: 'Order Placed', desc: 'New order for Linen Stripes Classic.' },
        { type: 'production_started', title: 'Production Started', desc: 'Order #102 has been moved to production.' },
        { type: 'invoice_generated', title: 'Invoice Generated', desc: 'Invoice #INV-2024-001 has been generated.' },
        { type: 'payment_received', title: 'Payment Received', desc: 'Received payment via UPI.' }
    ];

    for (const customer of customers) {
        // 5 random activities for each
        for (let i = 0; i < 5; i++) {
            const act = activityTypes[Math.floor(Math.random() * activityTypes.length)];
            const date = Math.floor(Date.now() / 1000) - (Math.floor(Math.random() * 60) * 86400);
            
            db.prepare(`
                INSERT INTO activity (customer_id, type, title, description, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(customer.id, act.type, act.title, act.desc, date);
        }
    }

    console.log('Workspace seeding complete.');
};

seedWorkspace();
db.close();
