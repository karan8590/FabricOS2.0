const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');

// Database backup & delete
function resetDatabaseFile() {
    console.log('Resetting database file...');
    try {
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('✓ Deleted fabricos.db');
        }
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(shmPath)) {
            fs.unlinkSync(shmPath);
            console.log('✓ Deleted fabricos.db-shm');
        }
        const walPath = dbPath + '-wal';
        if (fs.existsSync(walPath)) {
            fs.unlinkSync(walPath);
            console.log('✓ Deleted fabricos.db-wal');
        }
    } catch (e) {
        console.error('Warning during database file cleanup:', e);
    }
}

async function runSeeding() {
    resetDatabaseFile();

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // 1. Run Schema
    console.log('Applying schema.sql...');
    const schemaSql = fs.readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8');
    db.exec(schemaSql);
    console.log('✓ Schema applied successfully');

    // 2. Run Migrations from lib/db/index.ts
    console.log('Applying migrations...');
    const migrations = [
        `CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          meta TEXT,
          push_sent INTEGER DEFAULT 0,
          push_sent_at INTEGER
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          telegram_chat_id TEXT,
          telegram_username TEXT,
          telegram_first_name TEXT,
          token TEXT UNIQUE,
          token_expiry INTEGER,
          connected_at INTEGER,
          is_active INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );`,
        `ALTER TABLE salaries ADD COLUMN payment_method TEXT;`,
        `ALTER TABLE salaries ADD COLUMN reference_number TEXT;`,
        `ALTER TABLE salaries ADD COLUMN payment_date TEXT;`,
        `ALTER TABLE expenses ADD COLUMN description TEXT;`,
        `ALTER TABLE expenses ADD COLUMN paymentMode TEXT;`,
        `ALTER TABLE expenses ADD COLUMN reference TEXT;`,
        `ALTER TABLE expenses ADD COLUMN addedBy INTEGER;`,
        `ALTER TABLE expenses ADD COLUMN isAuto INTEGER DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN linkedId TEXT;`,
        `ALTER TABLE users ADD COLUMN fcm_token TEXT;`,
        `ALTER TABLE users ADD COLUMN push_notifications_enabled INTEGER DEFAULT 0;`,
        `ALTER TABLE notifications ADD COLUMN push_sent INTEGER DEFAULT 0;`,
        `ALTER TABLE notifications ADD COLUMN push_sent_at INTEGER;`,
        `ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'out';`,
        `ALTER TABLE expenses ADD COLUMN customerName TEXT;`,
        `ALTER TABLE vendors ADD COLUMN vendor_type TEXT DEFAULT 'Fabric Supplier';`,
        `ALTER TABLE orders ADD COLUMN embroidery_job_cost REAL DEFAULT 0;`,
        `ALTER TABLE orders ADD COLUMN dyeing_job_cost REAL DEFAULT 0;`,
        `CREATE TABLE IF NOT EXISTS order_job_costs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('embroidery', 'dyeing')),
          vendor_id INTEGER NOT NULL,
          metres REAL NOT NULL,
          rate_per_metre REAL NOT NULL,
          total_cost REAL NOT NULL,
          date TEXT NOT NULL,
          payment_mode TEXT NOT NULL,
          reference TEXT,
          status TEXT NOT NULL CHECK(status IN ('paid', 'unpaid')),
          notes TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
        );`,
        `CREATE TABLE IF NOT EXISTS vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          vendor_phone TEXT NOT NULL,
          order_id INTEGER,
          order_number TEXT,
          work_type TEXT NOT NULL CHECK(work_type IN ('embroidery', 'dyeing')),
          total_amount REAL NOT NULL,
          amount_paid REAL NOT NULL DEFAULT 0,
          balance REAL NOT NULL,
          due_date TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('paid', 'partial', 'unpaid', 'overdue')) DEFAULT 'unpaid',
          notes TEXT,
          linked_job_cost_id INTEGER,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS vendor_payment_instalments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_payment_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_mode TEXT NOT NULL,
          reference TEXT,
          notes TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (vendor_payment_id) REFERENCES vendor_payments(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS whatsapp_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          vendor_payment_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          UNIQUE(date, vendor_payment_id)
        );`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );`,
        `ALTER TABLE vendor_payments ADD COLUMN notes TEXT;`,
        `CREATE TABLE IF NOT EXISTS reminder_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sent_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          due_today_count INTEGER NOT NULL,
          overdue_count INTEGER NOT NULL,
          total_due_today REAL NOT NULL,
          total_overdue REAL NOT NULL,
          callmebot_status INTEGER
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_recipients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipient_name TEXT NOT NULL,
          telegram_chat_id TEXT NOT NULL UNIQUE,
          telegram_username TEXT,
          role TEXT DEFAULT 'Staff',
          notifications_enabled INTEGER DEFAULT 1,
          is_active INTEGER DEFAULT 1,
          connected_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          last_notification_sent_at INTEGER,
          preferred_language TEXT DEFAULT 'role_default',
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_notification_preferences (
          recipient_id INTEGER PRIMARY KEY,
          daily_payments INTEGER DEFAULT 1,
          attendance_reminder INTEGER DEFAULT 1,
          weekly_summary INTEGER DEFAULT 1,
          monthly_summary INTEGER DEFAULT 1,
          instant_order_alerts INTEGER DEFAULT 1,
          vendor_alerts INTEGER DEFAULT 1,
          salary_alerts INTEGER DEFAULT 1,
          expense_alerts INTEGER DEFAULT 1,
          FOREIGN KEY (recipient_id) REFERENCES telegram_recipients(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_notification_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipient_id INTEGER NOT NULL,
          notification_type TEXT NOT NULL,
          delivery_status TEXT NOT NULL CHECK(delivery_status IN ('delivered', 'failed', 'pending')),
          error_message TEXT,
          sent_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (recipient_id) REFERENCES telegram_recipients(id) ON DELETE CASCADE
        );`,
        `ALTER TABLE telegram_recipients ADD COLUMN preferred_language TEXT DEFAULT 'role_default';`,
        `INSERT OR IGNORE INTO telegram_notification_preferences (
            recipient_id, daily_payments, attendance_reminder, weekly_summary,
            monthly_summary, instant_order_alerts, vendor_alerts, salary_alerts, expense_alerts
        ) SELECT id, 1, 1, 1, 1, 1, 1, 1, 1 FROM telegram_recipients;`,
        `ALTER TABLE invoices ADD COLUMN pdf_url TEXT;`,
        `ALTER TABLE invoices ADD COLUMN telegram_delivered INTEGER DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN telegram_sent_at INTEGER;`,
        `ALTER TABLE expenses ADD COLUMN isPending INTEGER DEFAULT 0;`,
        `ALTER TABLE customers ADD COLUMN gstin TEXT;`,
        `ALTER TABLE customers ADD COLUMN state TEXT;`,
        `ALTER TABLE customers ADD COLUMN state_code TEXT;`,
        `ALTER TABLE customers ADD COLUMN customer_type TEXT DEFAULT 'B2C';`,
        `ALTER TABLE vendors ADD COLUMN state TEXT;`,
        `ALTER TABLE vendors ADD COLUMN state_code TEXT;`,
        `ALTER TABLE invoices ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN cgst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN sgst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN igst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN hsn_code TEXT;`,
        `ALTER TABLE invoices ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN place_of_supply TEXT;`,
        `ALTER TABLE invoices ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `ALTER TABLE expenses ADD COLUMN has_gst INTEGER DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN supplier_gstin TEXT;`,
        `ALTER TABLE expenses ADD COLUMN invoice_no TEXT;`,
        `ALTER TABLE expenses ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `ALTER TABLE expenses ADD COLUMN itc_claimed INTEGER DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN has_gst INTEGER DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `ALTER TABLE vendor_payments ADD COLUMN has_gst INTEGER DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          owner_uid INTEGER,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
          uses_shared_catalog INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );`,
        `CREATE TABLE IF NOT EXISTS super_admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );`,
        `ALTER TABLE users ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE customers ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE designs ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE orders ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE invoices ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE expenses ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE vendors ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE payments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE activity ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE attendance ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE advances ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE salaries ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE employee_advances ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE advance_instalments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE inventory_fabric ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE inventory_ink ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE inventory_packaging ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE settings ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE whatsapp_reminders ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE reminder_logs ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE order_job_costs ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE vendor_payments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE vendor_payment_instalments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE notifications ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE telegram_connections ADD COLUMN business_id TEXT DEFAULT 'business_001';`
    ];

    for (const sql of migrations) {
        try {
            db.exec(sql);
        } catch (e) {
            // Ignore error if column/table already exists
        }
    }
    try {
        db.exec('ALTER TABLE designs ADD COLUMN stock_quantity REAL DEFAULT 100');
    } catch (e) {}
    console.log('✓ Migrations executed successfully');

    // 2.5 Ensure permissions and role_permissions tables exist
    console.log('Creating permissions and role_permissions tables...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS permissions (
            key TEXT PRIMARY KEY,
            description TEXT
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            PRIMARY KEY (role, permission_key),
            FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE
        )
    `);
    console.log('✓ Permissions & role_permissions tables initialized');

    // 2.6 Seed permissions and role permissions mapping
    console.log('Seeding permissions and role permissions mapping...');
    const permissionDefs = [
        { key: 'dashboard.view', description: 'View dashboard' },
        { key: 'employees.view', description: 'View employee list' },
        { key: 'employees.create', description: 'Create new employees' },
        { key: 'employees.edit', description: 'Edit employee details' },
        { key: 'employees.delete', description: 'Delete employees' },
        { key: 'customers.view', description: 'View customer list' },
        { key: 'customers.create', description: 'Create new customers' },
        { key: 'customers.edit', description: 'Edit customer details' },
        { key: 'customers.delete', description: 'Delete customers' },
        { key: 'invoices.view', description: 'View invoices' },
        { key: 'invoices.create', description: 'Create invoices' },
        { key: 'invoices.edit', description: 'Edit invoices' },
        { key: 'invoices.pay', description: 'Record payments' },
        { key: 'orders.view', description: 'View orders' },
        { key: 'orders.create', description: 'Create orders' },
        { key: 'orders.approve', description: 'Approve orders' },
        { key: 'orders.complete', description: 'Mark orders as complete' },
        { key: 'expenses.view', description: 'View expenses' },
        { key: 'vendors.view', description: 'View vendors' },
        { key: 'catalog.view', description: 'View designs' },
        { key: 'catalog.manage', description: 'Manage designs' },
        { key: 'notifications.view', description: 'View notifications' },
        { key: 'settings.view', description: 'View system settings and Telegram center' },
        { key: 'settings.edit', description: 'Edit system settings and Telegram center' }
    ];

    const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)');
    for (const p of permissionDefs) {
        insertPerm.run(p.key, p.description);
    }

    const rolePermissions = [
        // Admin (All)
        { role: 'admin', key: 'dashboard.view' },
        { role: 'admin', key: 'employees.view' },
        { role: 'admin', key: 'employees.create' },
        { role: 'admin', key: 'employees.edit' },
        { role: 'admin', key: 'employees.delete' },
        { role: 'admin', key: 'customers.view' },
        { role: 'admin', key: 'customers.create' },
        { role: 'admin', key: 'customers.edit' },
        { role: 'admin', key: 'customers.delete' },
        { role: 'admin', key: 'invoices.view' },
        { role: 'admin', key: 'invoices.create' },
        { role: 'admin', key: 'invoices.edit' },
        { role: 'admin', key: 'invoices.pay' },
        { role: 'admin', key: 'orders.view' },
        { role: 'admin', key: 'orders.create' },
        { role: 'admin', key: 'orders.approve' },
        { role: 'admin', key: 'orders.complete' },
        { role: 'admin', key: 'expenses.view' },
        { role: 'admin', key: 'vendors.view' },
        { role: 'admin', key: 'catalog.view' },
        { role: 'admin', key: 'catalog.manage' },
        { role: 'admin', key: 'notifications.view' },
        { role: 'admin', key: 'settings.view' },
        { role: 'admin', key: 'settings.edit' },

        // Manager
        { role: 'manager', key: 'dashboard.view' },
        { role: 'manager', key: 'orders.view' },
        { role: 'manager', key: 'orders.create' },
        { role: 'manager', key: 'orders.approve' },
        { role: 'manager', key: 'orders.complete' },
        { role: 'manager', key: 'customers.view' },
        { role: 'manager', key: 'customers.create' },
        { role: 'manager', key: 'customers.edit' },
        { role: 'manager', key: 'invoices.view' },
        { role: 'manager', key: 'invoices.create' },
        { role: 'manager', key: 'invoices.pay' },
        { role: 'manager', key: 'expenses.view' },
        { role: 'manager', key: 'vendors.view' },
        { role: 'manager', key: 'catalog.view' },
        { role: 'manager', key: 'catalog.manage' },
        { role: 'manager', key: 'settings.view' },
        { role: 'manager', key: 'settings.edit' },

        // Staff
        { role: 'staff', key: 'dashboard.view' },
        { role: 'staff', key: 'orders.view' },
        { role: 'staff', key: 'orders.create' },
        { role: 'staff', key: 'catalog.view' },
        { role: 'staff', key: 'customers.view' },
        { role: 'staff', key: 'invoices.view' },

        // Customer
        { role: 'customer', key: 'catalog.view' },
        { role: 'customer', key: 'orders.view' }
    ];

    const insertRolePerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)');
    for (const rp of rolePermissions) {
        insertRolePerm.run(rp.role, rp.key);
    }
    console.log('✓ Seeded permission rules successfully');

    // 3. SEED DATA
    console.log('Generating password hashes...');
    const superAdminPassword = await bcrypt.hash('superadmin123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);
    const customerPassword = await bcrypt.hash('customer123', 10);

    const businessId = 'business_001';

    // A. Seed Business
    console.log('Seeding businesses...');
    db.prepare(`
        INSERT INTO businesses (id, name, type, owner_uid, status, uses_shared_catalog)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(businessId, 'Karan Textiles', 'textile', 1, 'active', 0);

    // B. Seed Super Admin
    console.log('Seeding super_admins...');
    db.prepare(`
        INSERT INTO super_admins (email, password_hash, name)
        VALUES (?, ?, ?)
    `).run('superadmin@fabricos.com', superAdminPassword, 'Super Admin User');

    // C. Seed Users (Admin, Manager, Staff, Customer User)
    console.log('Seeding users...');
    const userInsert = db.prepare(`
        INSERT INTO users (business_id, phone, password_hash, name, email, role, is_active, can_login, monthly_salary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    userInsert.run(businessId, '+919999999999', adminPassword, 'Admin User', 'admin@fabricos.com', 'admin', 1, 1, 0); // User ID: 1
    userInsert.run(businessId, '+919999999997', managerPassword, 'Manager User', 'manager@fabricos.com', 'manager', 1, 1, 0); // User ID: 2
    userInsert.run(businessId, '+919999999998', staffPassword, 'Staff User', 'staff@fabricos.com', 'staff', 1, 1, 0); // User ID: 3
    userInsert.run(businessId, '+919999999991', customerPassword, 'Rajesh Kumar', 'rajesh@gmail.com', 'customer', 1, 1, 0); // User ID: 4

    // Employees for Payroll/Attendance
    const empInsert = db.prepare(`
        INSERT INTO users (business_id, phone, password_hash, name, email, role, is_active, can_login, monthly_salary)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
    `);
    empInsert.run(businessId, '+919999999001', staffPassword, 'Rohan Mehta', 'rohan@fabricos.com', 'staff', 30000); // User ID: 5
    empInsert.run(businessId, '+919999999002', staffPassword, 'Sneha Reddy', 'sneha@fabricos.com', 'staff', 45000); // User ID: 6
    empInsert.run(businessId, '+919999999003', staffPassword, 'Vikram Singh', 'vikram@fabricos.com', 'staff', 24000); // User ID: 7
    empInsert.run(businessId, '+919999999004', staffPassword, 'Anjali Gupta', 'anjali@fabricos.com', 'staff', 35000); // User ID: 8

    console.log('✓ Users seeded successfully');

    // D. Seed Customers
    console.log('Seeding customers...');
    const customerInsert = db.prepare(`
        INSERT INTO customers (business_id, user_id, name, phone, outstanding_amount, total_orders, gstin, state, state_code, customer_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    customerInsert.run(businessId, 4, 'Rajesh Kumar', '+919999999991', 0, 0, '24AAAAA1111A1Z1', 'Gujarat', '24', 'B2B'); // Cust ID: 1
    customerInsert.run(businessId, null, 'Vikas Enterprises', '+919876543212', 0, 0, '27BBBBB2222B2Z2', 'Maharashtra', '27', 'B2B'); // Cust ID: 2
    customerInsert.run(businessId, null, 'Priya Sharma', '+919999999992', 0, 0, null, 'Gujarat', '24', 'B2C'); // Cust ID: 3
    customerInsert.run(businessId, null, 'Amit Patel', '+919999999993', 0, 0, null, 'Gujarat', '24', 'B2C'); // Cust ID: 4
    customerInsert.run(businessId, null, 'Suresh Mehta', '+919999999994', 0, 0, null, 'Rajasthan', '08', 'B2C'); // Cust ID: 5

    console.log('✓ Customers seeded successfully');

    // E. Seed Designs
    console.log('Seeding designs...');
    const designInsert = db.prepare(`
        INSERT INTO designs (business_id, name, category, image_url, price_per_meter, available)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    designInsert.run(businessId, 'Cotton Floral Print', 'cotton', null, 150.0, 1); // Design ID: 1
    designInsert.run(businessId, 'Silk Paisley', 'silk', null, 450.0, 1); // Design ID: 2
    designInsert.run(businessId, 'Linen Stripes', 'linen', null, 250.0, 1); // Design ID: 3
    designInsert.run(businessId, 'Velvet Solid', 'velvet', null, 550.0, 1); // Design ID: 4
    designInsert.run(businessId, 'Georgette Embroidery', 'georgette', null, 650.0, 1); // Design ID: 5

    console.log('✓ Designs seeded successfully');

    // F. Seed Vendors
    console.log('Seeding vendors...');
    const vendorInsert = db.prepare(`
        INSERT INTO vendors (business_id, name, contact, material_supplied, city, gst_no, state, state_code, vendor_type, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    vendorInsert.run(businessId, 'Textile Suppliers Ltd', '+919876543210', 'Cotton, Silk', 'Surat', '24CCCCC3333C3Z3', 'Gujarat', '24', 'Fabric Supplier', 50000); // Vendor ID: 1
    vendorInsert.run(businessId, 'Embroidery Works', '+919876543211', 'Embroidery threads', 'Surat', '24DDDDD4444D4Z4', 'Gujarat', '24', 'Embroidery Job Work', 15000); // Vendor ID: 2
    vendorInsert.run(businessId, 'Apex Dyeing & Printing', '+919876543215', 'Dyeing services', 'Mumbai', '27EEEEE5555E5Z5', 'Maharashtra', '27', 'Dyeing Job Work', 0); // Vendor ID: 3

    console.log('✓ Vendors seeded successfully');

    // G. Seed Orders
    console.log('Seeding orders...');
    const orderInsert = db.prepare(`
        INSERT INTO orders (business_id, customer_id, design_id, quantity_meters, total_price, status, order_number, created_at, approved_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    const day = 86400;

    // We will insert 15 orders spanning all statuses
    orderInsert.run(businessId, 1, 1, 100, 15000, 'invoiced', 'ORD-001', now - 30 * day, now - 30 * day, now - 28 * day); 
    orderInsert.run(businessId, 1, 2, 50, 22500, 'invoiced', 'ORD-002', now - 25 * day, now - 25 * day, now - 23 * day); 
    orderInsert.run(businessId, 2, 3, 200, 50000, 'invoiced', 'ORD-003', now - 20 * day, now - 20 * day, now - 18 * day); 
    orderInsert.run(businessId, 2, 4, 100, 55000, 'invoiced', 'ORD-004', now - 15 * day, now - 15 * day, now - 13 * day); 
    orderInsert.run(businessId, 3, 5, 80, 52000, 'invoiced', 'ORD-005', now - 12 * day, now - 12 * day, now - 10 * day); 
    orderInsert.run(businessId, 3, 1, 120, 18000, 'invoiced', 'ORD-006', now - 10 * day, now - 10 * day, now - 8 * day); 
    orderInsert.run(businessId, 4, 2, 40, 18000, 'invoiced', 'ORD-007', now - 8 * day, now - 8 * day, now - 6 * day); 
    orderInsert.run(businessId, 4, 3, 60, 15000, 'invoiced', 'ORD-008', now - 6 * day, now - 6 * day, now - 4 * day); 
    orderInsert.run(businessId, 5, 4, 30, 16500, 'invoiced', 'ORD-009', now - 5 * day, now - 5 * day, now - 3 * day); 
    orderInsert.run(businessId, 5, 5, 20, 13000, 'invoiced', 'ORD-010', now - 4 * day, now - 4 * day, now - 2 * day); 

    orderInsert.run(businessId, 1, 3, 150, 37500, 'completed', 'ORD-011', now - 3 * day, now - 3 * day, now - 1 * day); 
    orderInsert.run(businessId, 2, 1, 300, 45000, 'ready', 'ORD-012', now - 2 * day, now - 2 * day, null);
    orderInsert.run(businessId, 3, 2, 70, 31500, 'approved', 'ORD-013', now - 1 * day, now - 1 * day, null);
    orderInsert.run(businessId, 4, 4, 90, 49500, 'pending', 'ORD-014', now - 12 * 3600, null, null);
    orderInsert.run(businessId, 5, 1, 110, 16500, 'pending', 'ORD-015', now - 2 * 3600, null, null);

    console.log('✓ Orders seeded successfully');

    // H. Seed Invoices (10 Invoices total for orders 1-10)
    console.log('Seeding invoices...');
    const invoiceInsert = db.prepare(`
        INSERT INTO invoices (business_id, invoice_number, order_id, customer_id, amount, amount_paid, status, gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount, taxable_amount, gst_type, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invoicesData = [
        { invNo: 'INV-001', ordId: 1, custId: 1, amount: 15000, paid: 15000, status: 'paid', rate: 5, state: '24', isB2B: true },
        { invNo: 'INV-002', ordId: 2, custId: 1, amount: 22500, paid: 10000, status: 'partial', rate: 12, state: '24', isB2B: true },
        { invNo: 'INV-003', ordId: 3, custId: 2, amount: 50000, paid: 50000, status: 'paid', rate: 5, state: '27', isB2B: true },
        { invNo: 'INV-004', ordId: 4, custId: 2, amount: 55000, paid: 0, status: 'unpaid', rate: 12, state: '27', isB2B: true },
        { invNo: 'INV-005', ordId: 5, custId: 3, amount: 52000, paid: 52000, status: 'paid', rate: 12, state: '24', isB2B: false },
        { invNo: 'INV-006', ordId: 6, custId: 3, amount: 18000, paid: 5000, status: 'partial', rate: 5, state: '24', isB2B: false },
        { invNo: 'INV-007', ordId: 7, custId: 4, amount: 18000, paid: 0, status: 'unpaid', rate: 12, state: '24', isB2B: false },
        { invNo: 'INV-008', ordId: 8, custId: 4, amount: 15000, paid: 0, status: 'overdue', rate: 5, state: '24', isB2B: false },
        { invNo: 'INV-009', ordId: 9, custId: 5, amount: 16500, paid: 16500, status: 'paid', rate: 12, state: '08', isB2B: false },
        { invNo: 'INV-010', ordId: 10, custId: 5, amount: 13000, paid: 0, status: 'unpaid', rate: 12, state: '08', isB2B: false }
    ];

    for (const inv of invoicesData) {
        const taxable = inv.amount / (1 + inv.rate / 100);
        const gst = inv.amount - taxable;
        const isLocal = inv.state === '24' || !inv.isB2B;

        let cgst = 0, sgst = 0, igst = 0, gstType = 'NONE';
        if (inv.rate > 0) {
            if (isLocal) {
                cgst = gst / 2;
                sgst = gst / 2;
                gstType = 'CGST_SGST';
            } else {
                igst = gst;
                gstType = 'IGST';
            }
        }

        invoiceInsert.run(
            businessId,
            inv.invNo,
            inv.ordId,
            inv.custId,
            inv.amount,
            inv.paid,
            inv.status,
            inv.rate,
            gst,
            cgst,
            sgst,
            igst,
            taxable,
            gstType,
            now - 20 * day
        );
    }
    console.log('✓ Invoices seeded successfully');

    // I. Seed Payments (linked to paid and partial invoices)
    console.log('Seeding customer payments...');
    const paymentInsert = db.prepare(`
        INSERT INTO payments (business_id, invoice_id, customer_id, amount, method, reference_number, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    paymentInsert.run(businessId, 1, 1, 15000, 'upi', 'TXN-001', now - 27 * day, 'Full invoice clearance');
    paymentInsert.run(businessId, 2, 1, 10000, 'cash', 'TXN-002', now - 22 * day, 'Advance partial payment');
    paymentInsert.run(businessId, 3, 2, 30000, 'bank_transfer', 'TXN-003A', now - 17 * day, 'Part payment 1');
    paymentInsert.run(businessId, 3, 2, 20000, 'bank_transfer', 'TXN-003B', now - 16 * day, 'Part payment 2');
    paymentInsert.run(businessId, 5, 3, 52000, 'upi', 'TXN-005', now - 9 * day, 'Instant pay on delivery');
    paymentInsert.run(businessId, 6, 3, 5000, 'cash', 'TXN-006', now - 7 * day, 'Initial token payment');
    paymentInsert.run(businessId, 9, 5, 16500, 'upi', 'TXN-009', now - 2 * day, 'Cleared outstanding invoice');

    console.log('✓ Payments seeded successfully');

    // J. Update Customer outstanding amounts & total orders
    console.log('Updating customer balances and order counts...');
    const updateCustomerBalances = db.transaction(() => {
        const customers = db.prepare('SELECT id FROM customers').all();
        for (const cust of customers) {
            const unpaidTotal = db.prepare(`
                SELECT SUM(amount - amount_paid) as outstanding
                FROM invoices
                WHERE customer_id = ?
            `).get(cust.id).outstanding || 0;

            const orderCount = db.prepare(`
                SELECT COUNT(*) as count
                FROM orders
                WHERE customer_id = ?
            `).get(cust.id).count;

            db.prepare(`
                UPDATE customers
                SET outstanding_amount = ?, total_orders = ?
                WHERE id = ?
            `).run(unpaidTotal, orderCount, cust.id);
        }
    });
    updateCustomerBalances();
    console.log('✓ Customer outstanding balances updated in database');

    // K. Seed Timeline Activity
    console.log('Seeding timeline activities...');
    const activityInsert = db.prepare(`
        INSERT INTO activity (business_id, customer_id, type, title, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    activityInsert.run(businessId, 1, 'order_created', 'Order Created', 'Order #ORD-001 has been registered.', now - 30 * day);
    activityInsert.run(businessId, 1, 'production_started', 'Production Commenced', 'Fabric designs sent to print shop.', now - 29 * day);
    activityInsert.run(businessId, 1, 'invoice_generated', 'Invoice Generated', 'Invoice #INV-001 has been issued.', now - 28 * day);
    activityInsert.run(businessId, 1, 'payment_received', 'Payment Received', 'UPI transaction of ₹15,000 received.', now - 27 * day);

    activityInsert.run(businessId, 2, 'order_created', 'Bulk Order Created', 'Order #ORD-003 of 200m stripes registered.', now - 20 * day);
    activityInsert.run(businessId, 2, 'invoice_generated', 'Invoice Dispatched', 'Invoice #INV-003 issued.', now - 18 * day);
    activityInsert.run(businessId, 2, 'payment_received', 'Partial Payment Received', 'Bank transfer of ₹30,000 processed.', now - 17 * day);
    activityInsert.run(businessId, 2, 'payment_received', 'Final Payment Received', 'Bank transfer of ₹20,000 processed.', now - 16 * day);

    console.log('✓ Activities seeded successfully');

    // L. Seed Employee Attendance for Jan-May 2026
    console.log('Seeding employee attendance (Jan-May 2026)...');
    const attendanceInsert = db.prepare(`
        INSERT INTO attendance (business_id, date, employee_id, status, overtime_hours, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const months = [
        { name: 'January', days: 31, prefix: '2026-01' },
        { name: 'February', days: 28, prefix: '2026-02' },
        { name: 'March', days: 31, prefix: '2026-03' },
        { name: 'April', days: 30, prefix: '2026-04' },
        { name: 'May', days: 18, prefix: '2026-05' }
    ];

    for (const month of months) {
        for (let dayVal = 1; dayVal <= month.days; dayVal++) {
            const dateStr = `${month.prefix}-${String(dayVal).padStart(2, '0')}`;

            // Rohan Mehta (ID 5)
            let rohanStatus = 'present';
            let rohanOT = 0;
            if (dayVal % 7 === 0) {
                rohanStatus = 'absent';
            } else if (dayVal % 15 === 0) {
                rohanStatus = 'half_day';
            } else if (dayVal === 3) {
                rohanOT = 2;
            }
            attendanceInsert.run(businessId, dateStr, 5, rohanStatus, rohanOT, null);

            // Sneha Reddy (ID 6)
            let snehaStatus = 'present';
            let snehaOT = 0;
            if (dayVal === 14) {
                snehaStatus = 'absent';
            } else if (dayVal === 5) {
                snehaOT = 3;
            }
            attendanceInsert.run(businessId, dateStr, 6, snehaStatus, snehaOT, null);

            // Vikram Singh (ID 7)
            let vikramStatus = 'present';
            let vikramOT = 0;
            if (dayVal % 5 === 0) {
                vikramStatus = 'absent';
            }
            attendanceInsert.run(businessId, dateStr, 7, vikramStatus, vikramOT, null);

            // Anjali Gupta (ID 8)
            attendanceInsert.run(businessId, dateStr, 8, 'present', 0, null);
        }
    }
    console.log('✓ Attendance records seeded successfully');

    // M. Seed Employee Advances
    console.log('Seeding employee advances...');
    const advInsert = db.prepare(`
        INSERT INTO employee_advances (business_id, employee_id, total_amount, amount_repaid, remaining_balance, status, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const instInsert = db.prepare(`
        INSERT INTO advance_instalments (business_id, advance_id, date, amount, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Rohan Mehta: 2 advances
    const rohanAdvResult1 = advInsert.run(businessId, 5, 10000, 10000, 0, 'completed', 'New Year Advance', now - 120 * day);
    const rohanAdvId1 = Number(rohanAdvResult1.lastInsertRowid);
    instInsert.run(businessId, rohanAdvId1, '2026-02-05', 5000, 'Installment 1 (Feb)', now - 100 * day);
    instInsert.run(businessId, rohanAdvId1, '2026-03-05', 5000, 'Installment 2 (Mar)', now - 70 * day);

    const rohanAdvResult2 = advInsert.run(businessId, 5, 20000, 8000, 12000, 'active', 'Festival advance', now - 15 * day);
    const rohanAdvId2 = Number(rohanAdvResult2.lastInsertRowid);
    instInsert.run(businessId, rohanAdvId2, '2026-05-05', 5000, 'Repayment Part 1', now - 13 * day);
    instInsert.run(businessId, rohanAdvId2, '2026-05-12', 3000, 'Part Payment 2', now - 6 * day);

    // Sneha Reddy: ₹15,000
    const snehaAdvResult = advInsert.run(businessId, 6, 15000, 5000, 10000, 'active', 'Emergency advance', now - 12 * day);
    const snehaAdvId = Number(snehaAdvResult.lastInsertRowid);
    instInsert.run(businessId, snehaAdvId, '2026-05-10', 5000, 'First installment payment', now - 8 * day);

    // Vikram Singh: ₹5,000
    const vikramAdvResult = advInsert.run(businessId, 7, 5000, 5000, 0, 'completed', 'Short-term loan', now - 30 * day);
    const vikramAdvId = Number(vikramAdvResult.lastInsertRowid);
    instInsert.run(businessId, vikramAdvId, '2026-05-02', 5000, 'Full clearance installment', now - 16 * day);

    console.log('✓ Employee advances seeded successfully');

    // N. Seed Salaries (Jan-Apr 2026 computed salaries)
    console.log('Seeding pre-calculated salaries...');
    const salaryInsert = db.prepare(`
        INSERT INTO salaries (business_id, employee_id, month, working_days, present_days, absent_days, half_days, overtime_hours, basic_earned, overtime_pay, deductions, advance_recovery, net_payable, status, payment_method, reference_number, payment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const salaryMonths = [
        { month: '2026-01', days: 31 },
        { month: '2026-02', days: 28 },
        { month: '2026-03', days: 31 },
        { month: '2026-04', days: 30 }
    ];

    const employeesDetail = [
        { id: 5, salary: 30000 },
        { id: 6, salary: 45000 },
        { id: 7, salary: 24000 },
        { id: 8, salary: 35000 }
    ];

    for (const sm of salaryMonths) {
        for (const emp of employeesDetail) {
            const monthPrefix = `${sm.month}-%`;
            const atts = db.prepare(`
                SELECT status, overtime_hours
                FROM attendance
                WHERE employee_id = ? AND date LIKE ?
            `).all(emp.id, monthPrefix);

            let present = 0, absent = 0, half = 0, ot = 0;
            atts.forEach(a => {
                if (a.status === 'present') present++;
                else if (a.status === 'absent') absent++;
                else if (a.status === 'half_day') half++;
                ot += a.overtime_hours || 0;
            });

            const totalPresentDays = present + (half * 0.5);
            const basicEarned = (emp.salary / sm.days) * totalPresentDays;
            const otPay = ot * 100;
            
            let advanceRecovery = 0;
            if (emp.id === 5 && sm.month === '2026-02') advanceRecovery = 5000;
            if (emp.id === 5 && sm.month === '2026-03') advanceRecovery = 5000;

            const netPayable = basicEarned + otPay - advanceRecovery;

            salaryInsert.run(
                businessId,
                emp.id,
                sm.month,
                sm.days,
                present,
                absent,
                half,
                ot,
                basicEarned,
                otPay,
                0.0,
                advanceRecovery,
                netPayable,
                'paid',
                'bank_transfer',
                `SAL-REF-${sm.month}-${emp.id}`,
                `${sm.month}-05`
            );
        }
    }
    console.log('✓ Salaries history seeded successfully');

    // O. Seed Expenses (15 Expenses total)
    console.log('Seeding operating ledger expenses...');
    const expenseInsert = db.prepare(`
        INSERT INTO expenses (business_id, category, amount, date, description, paymentMode, reference, notes, addedBy, isAuto, linkedId, created_by_user_id, type, customerName, isPending, has_gst, supplier_gstin, invoice_no, taxable_amount, gst_rate, gst_amount, gst_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    expenseInsert.run(businessId, 'Raw Material', 25000, now - 28 * day, 'Premium cotton roll purchase', 'bank_transfer', 'TXN-EXP-001', 'Direct procurement', 1, 0, null, 1, 'out', null, 0, 1, '24CCCCC3333C3Z3', 'INV-SUP-101', 23809.52, 5, 1190.48, 'CGST_SGST', now - 28 * day);
    expenseInsert.run(businessId, 'Dyeing Charges', 8000, now - 26 * day, 'Batch dyeing for silk orders', 'upi', 'TXN-EXP-002', 'Job work', 1, 0, null, 1, 'out', null, 0, 1, '27EEEEE5555E5Z5', 'INV-DYE-98', 7142.86, 12, 857.14, 'IGST', now - 26 * day);
    expenseInsert.run(businessId, 'Rent', 30000, now - 25 * day, 'Factory warehouse rent', 'bank_transfer', 'TXN-EXP-003', 'Rent for May', 1, 0, null, 1, 'out', null, 0, 0, null, null, 30000, 0, 0, 'NONE', now - 25 * day);
    expenseInsert.run(businessId, 'Electricity', 6500, now - 24 * day, 'Utility bill', 'upi', 'TXN-EXP-004', 'Factory power charges', 1, 0, null, 1, 'out', null, 0, 1, '24GGGGG7777G7Z7', 'ELEC-2026-05', 5508.47, 18, 991.53, 'CGST_SGST', now - 24 * day);
    expenseInsert.run(businessId, 'Logistics', 4500, now - 22 * day, 'Tempo delivery to clients', 'cash', 'TXN-EXP-005', 'Local delivery cargo', 1, 0, null, 1, 'out', null, 0, 0, null, null, 4500, 0, 0, 'NONE', now - 22 * day);
    expenseInsert.run(businessId, 'Ink Purchase', 12000, now - 20 * day, 'Cyan and Magenta reactive ink batch', 'bank_transfer', 'TXN-EXP-006', 'Ink stock refill', 1, 0, null, 1, 'out', null, 0, 1, '24HHHHH8888H8Z8', 'INK-9922', 10169.49, 18, 1830.51, 'CGST_SGST', now - 20 * day);
    expenseInsert.run(businessId, 'Packaging Materials', 3500, now - 18 * day, 'Rolls and tag boxes', 'upi', 'TXN-EXP-007', 'Tags procurement', 1, 0, null, 1, 'out', null, 0, 1, '24IIIII9999I9Z9', 'PKG-11', 2966.10, 18, 533.90, 'CGST_SGST', now - 18 * day);
    expenseInsert.run(businessId, 'Wages', 15000, now - 15 * day, 'Part-time labor salary', 'cash', null, 'Casual labor weekly payout', 1, 0, null, 1, 'out', null, 0, 0, null, null, 15000, 0, 0, 'NONE', now - 15 * day);
    expenseInsert.run(businessId, 'Embroidery Charges', 12000, now - 12 * day, 'Floral embroidery work', 'upi', 'TXN-EXP-009', 'Job work order', 1, 0, null, 1, 'out', null, 0, 1, '24DDDDD4444D4Z4', 'INV-EMB-84', 10714.29, 12, 1285.71, 'CGST_SGST', now - 12 * day);
    expenseInsert.run(businessId, 'Office Stationaries', 1200, now - 10 * day, 'Paper and toner cartridge', 'cash', null, 'Stationary', 1, 0, null, 1, 'out', null, 0, 0, null, null, 1200, 0, 0, 'NONE', now - 10 * day);

    // Inflows
    expenseInsert.run(businessId, 'Customer Payment', 15000, now - 27 * day, 'UPI received from Rajesh Kumar', 'upi', 'TXN-001', 'Linked to INV-001', 1, 1, 'INV-001', 1, 'in', 'Rajesh Kumar', 0, 0, null, null, 15000, 0, 0, 'NONE', now - 27 * day);
    expenseInsert.run(businessId, 'Customer Payment', 10000, now - 22 * day, 'Cash received from Rajesh Kumar', 'cash', 'TXN-002', 'Linked to INV-002', 1, 1, 'INV-002', 1, 'in', 'Rajesh Kumar', 0, 0, null, null, 10000, 0, 0, 'NONE', now - 22 * day);
    expenseInsert.run(businessId, 'Customer Payment', 30000, now - 17 * day, 'Bank transfer from Vikas Enterprises', 'bank_transfer', 'TXN-003A', 'Linked to INV-003', 1, 1, 'INV-003', 1, 'in', 'Vikas Enterprises', 0, 0, null, null, 30000, 0, 0, 'NONE', now - 17 * day);
    expenseInsert.run(businessId, 'Customer Payment', 20000, now - 16 * day, 'Bank transfer from Vikas Enterprises', 'bank_transfer', 'TXN-003B', 'Linked to INV-003', 1, 1, 'INV-003', 1, 'in', 'Vikas Enterprises', 0, 0, null, null, 20000, 0, 0, 'NONE', now - 16 * day);
    expenseInsert.run(businessId, 'Customer Payment', 52000, now - 9 * day, 'UPI received from Priya Sharma', 'upi', 'TXN-005', 'Linked to INV-005', 1, 1, 'INV-005', 1, 'in', 'Priya Sharma', 0, 0, null, null, 52000, 0, 0, 'NONE', now - 9 * day);

    console.log('✓ Expenses & operating ledger entries seeded successfully');

    // P. Seed Vendor Payments & Instalments & Job Costs
    console.log('Seeding vendor payments, job work, and instalments...');
    const jobInsert = db.prepare(`
        INSERT INTO order_job_costs (business_id, order_id, type, vendor_id, metres, rate_per_metre, total_cost, date, payment_mode, reference, status, notes, has_gst, gst_rate, gst_amount, taxable_amount, gst_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    jobInsert.run(businessId, 1, 'embroidery', 2, 100, 12, 1200, '2026-05-01', 'upi', 'TXN-JOB-001', 'paid', 'Embroidery job done', 1, 12, 128.57, 1071.43, 'CGST_SGST');
    const jobCostId1 = Number(db.prepare("SELECT id FROM order_job_costs WHERE reference = 'TXN-JOB-001'").get().id);

    jobInsert.run(businessId, 2, 'dyeing', 3, 50, 20, 1000, '2026-05-02', 'bank_transfer', 'TXN-JOB-002', 'unpaid', 'Dyeing job pending payment', 1, 12, 107.14, 892.86, 'IGST');
    const jobCostId2 = Number(db.prepare("SELECT id FROM order_job_costs WHERE reference = 'TXN-JOB-002'").get().id);

    const vpInsert = db.prepare(`
        INSERT INTO vendor_payments (business_id, vendor_id, vendor_name, vendor_phone, order_id, order_number, work_type, total_amount, amount_paid, balance, due_date, status, notes, linked_job_cost_id, has_gst, gst_rate, gst_amount, taxable_amount, gst_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    vpInsert.run(businessId, 2, 'Embroidery Works', '+919876543211', 1, 'ORD-001', 'embroidery', 1200.0, 1200.0, 0.0, '2026-05-10', 'paid', 'Cleared immediately', jobCostId1, 1, 12, 128.57, 1071.43, 'CGST_SGST');
    const vpId1 = Number(db.prepare("SELECT id FROM vendor_payments WHERE order_number = 'ORD-001'").get().id);

    vpInsert.run(businessId, 3, 'Apex Dyeing & Printing', '+919876543215', 2, 'ORD-002', 'dyeing', 1000.0, 0.0, 1000.0, '2026-05-25', 'unpaid', 'Awaiting bill clearance', jobCostId2, 1, 12, 107.14, 892.86, 'IGST');

    vpInsert.run(businessId, 1, 'Textile Suppliers Ltd', '+919876543210', null, null, 'embroidery', 30000.0, 15000.0, 15000.0, '2026-05-15', 'partial', 'Procured bulk threads', null, 0, 0, 0, 30000.0, 'NONE');
    const vpId3 = Number(db.prepare("SELECT id FROM vendor_payments WHERE total_amount = 30000").get().id);

    vpInsert.run(businessId, 1, 'Textile Suppliers Ltd', '+919876543210', null, null, 'dyeing', 20000.0, 0.0, 20000.0, '2026-05-10', 'overdue', 'Overdue material cost', null, 0, 0, 0, 20000.0, 'NONE');
    vpInsert.run(businessId, 2, 'Embroidery Works', '+919876543211', null, null, 'embroidery', 8000.0, 0.0, 8000.0, '2026-05-30', 'unpaid', 'Awaiting fabric tags shipment', null, 0, 0, 0, 8000.0, 'NONE');

    const vpiInsert = db.prepare(`
        INSERT INTO vendor_payment_instalments (business_id, vendor_payment_id, date, amount, payment_mode, reference, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    vpiInsert.run(businessId, vpId1, '2026-05-01', 1200.0, 'upi', 'TXN-VPI-001', 'Cleared');
    vpiInsert.run(businessId, vpId3, '2026-05-12', 15000.0, 'bank_transfer', 'TXN-VPI-002', 'First part payment');

    console.log('✓ Vendor payments seeded successfully');

    // Q. Seed Inventory
    console.log('Seeding inventory records...');
    const fabricInsert = db.prepare(`
        INSERT INTO inventory_fabric (business_id, design_name, vendor_id, metres_ordered, metres_received, metres_used, balance, purchase_cost, rate_per_metre, linked_order_no, purchase_date, invoice_no, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    fabricInsert.run(businessId, 'Cotton Floral Print', 1, 500, 500, 200, 300, 50000, 100, 'ORD-001', '2026-05-01', 'INV-SUP-101', 'High quality cotton');
    fabricInsert.run(businessId, 'Silk Paisley', 1, 200, 200, 50, 150, 60000, 300, 'ORD-002', '2026-05-02', 'INV-SUP-102', 'Silk rolls');
    fabricInsert.run(businessId, 'Linen Stripes', 1, 300, 300, 100, 200, 45000, 150, 'ORD-003', '2026-05-03', 'INV-SUP-103', 'Linen stripes');

    const inkInsert = db.prepare(`
        INSERT INTO inventory_ink (business_id, ink_colour, quantity, unit, supplier, purchase_date, cost_per_unit, current_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    inkInsert.run(businessId, 'Cyan', 50, 'L', 'Ink World', '2026-05-05', 400, 45);
    inkInsert.run(businessId, 'Magenta', 50, 'L', 'Ink World', '2026-05-05', 400, 42);
    inkInsert.run(businessId, 'Yellow', 50, 'L', 'Ink World', '2026-05-05', 400, 48);

    const pkgInsert = db.prepare(`
        INSERT INTO inventory_packaging (business_id, item_name, type, quantity, supplier, purchase_date, cost, current_stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    pkgInsert.run(businessId, 'Plastic Wrap Rolls', 'Roll', 20, 'Packers Ltd', '2026-05-06', 250, 15);
    pkgInsert.run(businessId, 'Fabric Cover Bags', 'Cover', 500, 'Packers Ltd', '2026-05-06', 1500, 400);

    console.log('✓ Inventory seeded successfully');

    // R. Settings
    console.log('Seeding settings...');
    const settingsInsert = db.prepare(`
        INSERT OR REPLACE INTO settings (business_id, key, value)
        VALUES (?, ?, ?)
    `);
    settingsInsert.run(businessId, 'gst_number', '24AAAAA0000A1Z5');
    settingsInsert.run(businessId, 'company_name', 'Karan Textiles');
    settingsInsert.run(businessId, 'company_address', '102-105 Textile Tower, Ring Road, Surat, Gujarat - 395002');
    settingsInsert.run(businessId, 'company_phone', '+919999999999');
    settingsInsert.run(businessId, 'company_email', 'karan@textiles.com');

    console.log('✓ Settings seeded successfully');

    db.close();
    console.log('\n✅ Database initialization & comprehensive seeding completed successfully!');
}

runSeeding().catch(e => {
    console.error('❌ Seeding script encountered an error:', e);
    process.exit(1);
});
