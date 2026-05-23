const { mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const Database = require('better-sqlite3');

// Create data directory if it doesn't exist
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('✓ Created data directory');
}

// Initialize database
const dbPath = join(dataDir, 'fabricos.db');
const db = new Database(dbPath);
console.log('✓ Connected to database');

// Enable foreign keys
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
console.log('✓ Enabled foreign keys and WAL mode');

// Read and execute schema
const fs = require('fs');
const schema = fs.readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8');

try {
    db.exec(schema);
    console.log('✓ Database schema created successfully');
} catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
}

db.close();
console.log('✓ Database initialized successfully!');
