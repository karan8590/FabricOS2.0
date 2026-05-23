const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

const CUSTOMERS = [
    { name: 'Aditya Textile Hub', phone: '+919825012345', category: 'Wholesaler' },
    { name: 'Bombay Fashion Mart', phone: '+919900112233', category: 'Retailer' },
    { name: 'Chennai Silks Co', phone: '+919444055667', category: 'Enterprise' },
    { name: 'Delhi Draperies', phone: '+919811022334', category: 'Wholesaler' },
    { name: 'Elegant Fabrics', phone: '+919555112233', category: 'Boutique' },
    { name: 'Future Textiles', phone: '+919666011223', category: 'Retailer' },
    { name: 'Gujarat Garments', phone: '+919777122334', category: 'Enterprise' },
    { name: 'Heritage Handlooms', phone: '+919888233445', category: 'Boutique' },
    { name: 'Indore Interiors', phone: '+919999344556', category: 'Wholesaler' },
    { name: 'Jaipur Jute Works', phone: '+919000455667', category: 'Retailer' }
];

const DESIGNS = db.prepare('SELECT id, price_per_meter FROM designs').all();

function getRandomDate(start, end) {
    return Math.floor((start.getTime() + Math.random() * (end.getTime() - start.getTime())) / 1000);
}

function populate() {
    console.log('🚀 Starting deep history population...');

    // Clear existing transaction data for a clean historical simulation
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM activity').run();
    db.prepare('DELETE FROM orders').run();
    
    const customerIds = [];
    for (const c of CUSTOMERS) {
        // Create user if not exists
        const userExists = db.prepare('SELECT id FROM users WHERE phone = ?').get(c.phone);
        let userId;
        if (!userExists) {
            const res = db.prepare('INSERT INTO users (phone, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
                c.phone, 
                '$2b$10$YourHashedPasswordHere', // placeholder
                c.name, 
                'customer'
            );
            userId = res.lastInsertRowid;
        } else {
            userId = userExists.id;
        }

        // Create customer if not exists
        const custExists = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(userId);
        if (!custExists) {
            const res = db.prepare('INSERT INTO customers (user_id, name, phone, outstanding_amount, total_orders) VALUES (?, ?, ?, 0, 0)').run(
                userId, c.name, c.phone
            );
            customerIds.push(res.lastInsertRowid);
        } else {
            customerIds.push(custExists.id);
        }
    }

    const years = [2024, 2025, 2026];
    
    for (const year of years) {
        console.log(`📅 Generating data for ${year}...`);
        
        let orderCount = year === 2024 ? 80 : (year === 2025 ? 120 : 50);
        let endDate = year === 2026 ? new Date(2026, 4, 14) : new Date(year, 11, 31);
        let startDate = new Date(year, 0, 1);

        for (let i = 0; i < orderCount; i++) {
            const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
            const design = DESIGNS[Math.floor(Math.random() * DESIGNS.length)];
            const createdAt = getRandomDate(startDate, endDate);
            const quantity = Math.floor(Math.random() * 200) + 20;
            const totalPrice = quantity * design.price_per_meter;
            
            // Random status distribution
            let status = 'completed';
            if (year === 2026 && createdAt > 1711929600) { // After April 2026
                const r = Math.random();
                if (r < 0.1) status = 'pending';
                else if (r < 0.2) status = 'approved';
                else if (r < 0.4) status = 'invoiced';
                else status = 'completed';
            }

            const completedAt = status === 'completed' || status === 'invoiced' ? createdAt + (86400 * 5) : null;

            const orderRes = db.prepare(`
                INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, created_at, completed_at, order_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                customerId, 
                design.id, 
                quantity, 
                totalPrice, 
                status, 
                createdAt, 
                completedAt,
                `ORD-${year}-${1000 + i}`
            );

            const orderId = orderRes.lastInsertRowid;

            // Create Invoice if status is invoiced or completed
            if (status === 'invoiced' || status === 'completed') {
                const invoiceStatus = status === 'completed' ? 'paid' : 'unpaid';
                const paidAt = invoiceStatus === 'paid' ? completedAt + 3600 : null;
                
                const invRes = db.prepare(`
                    INSERT INTO invoices (order_id, customer_id, amount, status, generated_at, paid_at, invoice_number)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    orderId,
                    customerId,
                    totalPrice,
                    invoiceStatus,
                    completedAt,
                    paidAt,
                    `INV-${year}-${2000 + i}`
                );

                const invoiceId = invRes.lastInsertRowid;

                if (invoiceStatus === 'paid') {
                    db.prepare(`
                        INSERT INTO payments (invoice_id, customer_id, amount, method, payment_date, reference_number)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(
                        invoiceId,
                        customerId,
                        totalPrice,
                        ['Bank Transfer', 'UPI', 'Cheque'][Math.floor(Math.random() * 3)],
                        paidAt,
                        `REF-${Math.random().toString(36).toUpperCase().substring(2, 10)}`
                    );
                }
            }

            // Create some activity logs
            db.prepare(`
                INSERT INTO activity (customer_id, type, title, description, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                customerId,
                'order_created',
                'New Order Created',
                `Order ${quantity}m of design`,
                createdAt
            );
        }
    }

    console.log('✅ Deep history population complete!');
    db.close();
}

populate();
