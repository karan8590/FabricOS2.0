const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. AUTOINCREMENT -> SERIAL
schema = schema.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
schema = schema.replace(/INTEGER PRIMARY KEY/g, 'SERIAL PRIMARY KEY'); // catch-all for IDs

// 2. REAL -> NUMERIC
schema = schema.replace(/REAL/g, 'NUMERIC');

// 3. strftime('%s', 'now') -> (EXTRACT(EPOCH FROM NOW()))::integer
schema = schema.replace(/\(strftime\('%s', 'now'\)\)/g, '(EXTRACT(EPOCH FROM NOW()))::integer');
schema = schema.replace(/strftime\('%s', 'now'\)/g, '(EXTRACT(EPOCH FROM NOW()))::integer');

// Postgres SERIAL columns don't like id TEXT PRIMARY KEY changing to SERIAL if it's explicitly TEXT, but SQLite schema has 'id TEXT PRIMARY KEY' for businesses, which is fine as TEXT.
// We only replaced INTEGER PRIMARY KEY.
// Fix businesses which has TEXT PRIMARY KEY:
// Wait, `businesses` uses `id TEXT PRIMARY KEY`. That's fine in Postgres.

fs.writeFileSync(schemaPath, schema);
console.log('Schema converted successfully.');
