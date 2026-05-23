const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

const customerId = 108; // Rajesh Kumar

console.log(`Adding sample data for Customer ID: ${customerId}...`);

try {
    db.transaction(() => {
        // 1. Add some Orders
        const designs = db.prepare('SELECT id, price_per_meter FROM designs LIMIT 3').all();
        
        for (let i = 0; i < designs.length; i++) {
            const design = designs[i];
            const quantity = 50 + (i * 20);
            const totalPrice = design.price_per_meter * quantity;
            // Status must be one of: 'pending', 'approved', 'ready', 'delivered', 'completed', 'invoiced'
            const status = i === 0 ? 'approved' : (i === 1 ? 'ready' : 'pending');
            const now = Math.floor(Date.now() / 1000) - (i * 86400 * 2); // 0, 2, 4 days ago
            
            const orderNum = `ORD-202605-0${80 + i}`;
            
            const res = db.prepare(`
                INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, order_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(customerId, design.id, quantity, totalPrice, status, orderNum, now);
            
            const orderId = res.lastInsertRowid;
            
            // 2. Add Activity
            db.prepare(`
                INSERT INTO activity (customer_id, type, title, description, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(customerId, 'order_created', 'New Order Placed', `Order ${orderNum} for ${quantity}m of fabric.`, now);
            
            if (status !== 'pending') {
                 db.prepare(`
                    INSERT INTO activity (customer_id, type, title, description, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run(customerId, 'production_update', 'Manufacturing Started', `Order ${orderNum} is now in ${status} stage.`, now + 3600);
            }
            
            // 3. Add an Invoice for the 'ready' one
            if (status === 'ready') {
                const invNum = `INV-20260514-900${i}`;
                const invRes = db.prepare(`
                    INSERT INTO invoices (order_id, customer_id, amount, status, invoice_number, generated_at, due_date)
                    VALUES (?, ?, ?, 'unpaid', ?, ?, ?)
                `).run(orderId, customerId, totalPrice, invNum, now + 7200, now + 86400 * 7);
                
                db.prepare(`
                    INSERT INTO activity (customer_id, type, title, description, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run(customerId, 'invoice_generated', 'Invoice Available', `Invoice ${invNum} has been generated for your order.`, now + 7200);
            }
        }
        
        // 4. Update Customer Stats
        db.prepare(`
            UPDATE customers 
            SET total_orders = 3, outstanding_amount = 42000 
            WHERE id = ?
        `).run(customerId);
        
        console.log('Sample data added successfully!');
    })();
} catch (error) {
    console.error('Failed to add sample data:', error);
} finally {
    db.close();
}
