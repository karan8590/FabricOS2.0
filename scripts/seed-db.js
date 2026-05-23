const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

async function seedDatabase() {
    console.log('Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminInsert = db.prepare(`
    INSERT OR IGNORE INTO users (phone, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);
    adminInsert.run('+919999999999', adminPassword, 'Admin User', 'admin');
    console.log('✓ Created admin user (phone: +919999999999, password: admin123)');

    // Create staff user
    const staffPassword = await bcrypt.hash('staff123', 10);
    const staffInsert = db.prepare(`
    INSERT OR IGNORE INTO users (phone, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);
    staffInsert.run('+919999999998', staffPassword, 'Staff User', 'staff');
    console.log('✓ Created staff user (phone: +919999999998, password: staff123)');

    // Create customer users and customers
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customerUserInsert = db.prepare(`
    INSERT OR IGNORE INTO users (phone, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);

    const customers = [
        { phone: '+919999999991', name: 'Rajesh Kumar' },
        { phone: '+919999999992', name: 'Priya Sharma' },
        { phone: '+919999999993', name: 'Amit Patel' },
    ];

    for (const customer of customers) {
        customerUserInsert.run(customer.phone, customerPassword, customer.name, 'customer');
        const userId = db.prepare('SELECT id FROM users WHERE phone = ?').get(customer.phone).id;

        db.prepare(`
      INSERT OR IGNORE INTO customers (user_id, name, phone)
      VALUES (?, ?, ?)
    `).run(userId, customer.name, customer.phone);
    }
    console.log('✓ Created 3 customer users (password: customer123 for all)');

    // Create designs
    const designInsert = db.prepare(`
    INSERT OR IGNORE INTO designs (name, price_per_meter, available)
    VALUES (?, ?, ?)
  `);

    const designs = [
        { name: 'Cotton Floral Print', price: 150 },
        { name: 'Silk Paisley', price: 450 },
        { name: 'Linen Stripes', price: 250 },
        { name: 'Velvet Solid', price: 550 },
        { name: 'Georgette Embroidery', price: 650 },
    ];

    designs.forEach(design => {
        designInsert.run(design.name, design.price, 1);
    });
    console.log('✓ Created 5 design samples');

    // Create sample orders
    const orderInsert = db.prepare(`
    INSERT INTO orders (customer_id, design_id, quantity_meters, total_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 86400;

    // Recent orders
    orderInsert.run(1, 1, 50, 7500, 'pending', now - dayInSeconds * 1);
    orderInsert.run(2, 2, 30, 13500, 'approved', now - dayInSeconds * 2);
    orderInsert.run(1, 3, 40, 10000, 'completed', now - dayInSeconds * 5);
    orderInsert.run(3, 4, 25, 13750, 'pending', now - dayInSeconds * 3);

    console.log('✓ Created sample orders');

    // Create sample expenses
    const expenseInsert = db.prepare(`
    INSERT INTO expenses (category, amount, date, notes, created_by_user_id)
    VALUES (?, ?, ?, ?, ?)
  `);

    expenseInsert.run('Raw Material', 25000, now - dayInSeconds * 3, 'Cotton purchase', 1);
    expenseInsert.run('Labor', 15000, now - dayInSeconds * 7, 'Weekly wages', 1);
    expenseInsert.run('Utilities', 5000, now - dayInSeconds * 10, 'Electricity bill', 1);

    console.log('✓ Created sample expenses');

    // Create sample vendors
    const vendorInsert = db.prepare(`
    INSERT INTO vendors (name, contact, material_supplied, balance)
    VALUES (?, ?, ?, ?)
  `);

    vendorInsert.run('Textile Suppliers Ltd', '+919876543210', 'Cotton, Silk', 50000);
    vendorInsert.run('Embroidery Works', '+919876543211', 'Embroidery threads', 15000);

    console.log('✓ Created sample vendors');

    db.close();
    console.log('\n✅ Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: +919999999999 / admin123');
    console.log('Staff: +919999999998 / staff123');
    console.log('Customer: +919999999991 / customer123');
}

seedDatabase().catch(console.error);
