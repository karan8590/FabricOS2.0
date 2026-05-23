import { Client } from 'pg';

const connectionString = 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function seedPermissions() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to apply permissions...');
        await client.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                key TEXT PRIMARY KEY,
                description TEXT
            );
        `);
        console.log('Created permissions table.');

        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role TEXT NOT NULL,
                permission_key TEXT NOT NULL,
                PRIMARY KEY (role, permission_key),
                FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE
            );
        `);
        console.log('Created role_permissions table.');

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

        console.log('Inserting permission definitions...');
        for (const p of permissionDefs) {
            await client.query(
                'INSERT INTO permissions (key, description) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                [p.key, p.description]
            );
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

        console.log('Inserting role mappings...');
        for (const rp of rolePermissions) {
            await client.query(
                'INSERT INTO role_permissions (role, permission_key) VALUES ($1, $2) ON CONFLICT (role, permission_key) DO NOTHING',
                [rp.role, rp.key]
            );
        }

        console.log('Success! Permissions seeded.');
    } catch (err) {
        console.error('Error seeding permissions:', err);
    } finally {
        await client.end();
    }
}

seedPermissions();
