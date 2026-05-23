const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Fixing permissions with Enterprise Upgrade...');

// Ensure permissions table exists
try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
        key TEXT PRIMARY KEY,
        description TEXT
    )
    `);
} catch (e) {
    console.log('Permissions table might already exist, proceeding...');
}

const permissionDefs = [
    // Dashboard
    { key: 'dashboard.view', description: 'View dashboard' },

    // Employees
    { key: 'employees.view', description: 'View employee list' },
    { key: 'employees.create', description: 'Create new employees' },
    { key: 'employees.edit', description: 'Edit employee details' },
    { key: 'employees.delete', description: 'Delete employees' },

    // Customers
    { key: 'customers.view', description: 'View customer list' },
    { key: 'customers.create', description: 'Create new customers' },
    { key: 'customers.edit', description: 'Edit customer details' },
    { key: 'customers.delete', description: 'Delete customers' },

    // Invoices
    { key: 'invoices.view', description: 'View invoices' },
    { key: 'invoices.create', description: 'Create invoices' },
    { key: 'invoices.edit', description: 'Edit invoices' },
    { key: 'invoices.pay', description: 'Record payments' },

    // Orders (New)
    { key: 'orders.view', description: 'View orders' },
    { key: 'orders.create', description: 'Create orders' },
    { key: 'orders.approve', description: 'Approve orders' },
    { key: 'orders.complete', description: 'Mark orders as complete' },

    // Expenses (New)
    { key: 'expenses.view', description: 'View expenses' },

    // Catalog
    { key: 'catalog.view', description: 'View designs' },
    { key: 'catalog.manage', description: 'Manage designs' },

    // Vendors
    { key: 'vendors.view', description: 'View vendors' },

    // Notifications
    { key: 'notifications.view', description: 'View notifications' },

    // Settings
    { key: 'settings.view', description: 'View system settings and Telegram center' },
    { key: 'settings.edit', description: 'Edit system settings and Telegram center' },
];

const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)');

let pCount = 0;
for (const p of permissionDefs) {
    const res = insertPerm.run(p.key, p.description);
    if (res.changes > 0) pCount++;
}
console.log(`✅ Added ${pCount} new permissions.`);

// Now assign to roles
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

    // Manager (Enhanced)
    { role: 'manager', key: 'dashboard.view' },
    { role: 'manager', key: 'orders.view' },
    { role: 'manager', key: 'orders.create' },
    { role: 'manager', key: 'orders.approve' }, // Added
    { role: 'manager', key: 'orders.complete' }, // Added
    { role: 'manager', key: 'customers.view' },
    { role: 'manager', key: 'customers.create' },
    { role: 'manager', key: 'customers.edit' },
    { role: 'manager', key: 'invoices.view' },
    { role: 'manager', key: 'invoices.create' },
    { role: 'manager', key: 'invoices.pay' },
    { role: 'manager', key: 'expenses.view' }, // Added
    { role: 'manager', key: 'vendors.view' }, // Added
    { role: 'manager', key: 'catalog.view' },
    { role: 'manager', key: 'catalog.manage' },
    { role: 'manager', key: 'settings.view' },
    { role: 'manager', key: 'settings.edit' },

    // Staff (Limited)
    { role: 'staff', key: 'dashboard.view' }, // Staff can see dashboard? usually yes
    { role: 'staff', key: 'orders.view' },
    { role: 'staff', key: 'orders.create' },
    { role: 'staff', key: 'catalog.view' },
    { role: 'staff', key: 'customers.view' },
    { role: 'staff', key: 'invoices.view' },

    // Customer
    { role: 'customer', key: 'catalog.view' },
    { role: 'customer', key: 'orders.view' }, // View own orders
];

const insertRolePerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)');

let rCount = 0;
for (const rp of rolePermissions) {
    try {
        const res = insertRolePerm.run(rp.role, rp.key);
        if (res.changes > 0) rCount++;
    } catch (e) {
        // console.error(`Failed to assign ${rp.key} to ${rp.role}: ${e.message}`);
    }
}

console.log(`✅ Assigned ${rCount} new role permissions.`);
db.close();
