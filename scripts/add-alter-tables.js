const fs = require('fs');
const path = require('path');

const dbIndexPath = path.join(__dirname, '../lib/db/index.ts');
let dbIndex = fs.readFileSync(dbIndexPath, 'utf8');

const tables = [
  'users', 'customers', 'designs', 'orders', 'invoices', 'expenses',
  'vendors', 'payments', 'activity', 'attendance', 'advances', 'salaries',
  'employee_advances', 'advance_instalments', 'inventory_fabric',
  'inventory_ink', 'inventory_packaging', 'settings', 'whatsapp_reminders',
  'reminder_logs', 'order_job_costs', 'vendor_payments', 'vendor_payment_instalments',
  'notifications'
];

let migrationsToAdd = tables.map(t => 
  `            \`ALTER TABLE ${t} ADD COLUMN business_id TEXT DEFAULT 'business_001';\`,`
).join('\n');

// We also need to create businesses and super_admins in the migrations if they don't exist
const createBusinesses = `
            \`CREATE TABLE IF NOT EXISTS businesses (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              owner_uid INTEGER,
              status TEXT DEFAULT 'active',
              uses_shared_catalog INTEGER DEFAULT 0,
              created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );\`,
            \`CREATE TABLE IF NOT EXISTS super_admins (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              name TEXT NOT NULL,
              created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );\`,
`;

// Find where migrations array is defined
const migrationsRegex = /const migrations = \[([\s\S]*?)\];/;
const match = dbIndex.match(migrationsRegex);

if (match) {
    let existingMigrations = match[1];
    
    // Only add if not already added
    if (!existingMigrations.includes('ADD COLUMN business_id')) {
        let newMigrationsArray = \`const migrations = [\${existingMigrations}\n\${createBusinesses}\n\${migrationsToAdd}\n];\`;
        dbIndex = dbIndex.replace(migrationsRegex, newMigrationsArray);
        fs.writeFileSync(dbIndexPath, dbIndex);
        console.log('Successfully added migrations to lib/db/index.ts');
    } else {
        console.log('Migrations already exist in lib/db/index.ts');
    }
}
