const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
let schema = fs.readFileSync(schemaPath, 'utf8');

const tablesToSkip = ['businesses', 'super_admins'];

// Add new tables at the top
const newTables = `
-- Businesses (Multi-tenant root)
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  owner_uid INTEGER,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
  uses_shared_catalog INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Super Admins
CREATE TABLE IF NOT EXISTS super_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

`;

if (!schema.includes('CREATE TABLE IF NOT EXISTS businesses')) {
    schema = newTables + schema;
}

// Inject business_id into all tables except the skipped ones
const tableRegex = /CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+) \(([\s\S]*?)\);/g;
schema = schema.replace(tableRegex, (match, tableName, tableBody) => {
    if (tablesToSkip.includes(tableName)) return match;
    
    // Check if business_id already exists
    if (tableBody.includes('business_id TEXT')) return match;
    
    // Insert business_id after the first line (usually the id column)
    const lines = tableBody.split('\n');
    let insertIndex = 1; // After the first line inside the table definition
    
    lines.splice(insertIndex, 0, "  business_id TEXT DEFAULT 'business_001',");
    return `CREATE TABLE IF NOT EXISTS ${tableName} (${lines.join('\n')});`;
});

fs.writeFileSync(schemaPath, schema);
console.log('Successfully injected business_id into schema.sql');
