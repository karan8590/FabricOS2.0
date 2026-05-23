const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Migrating users table to add can_login column...');

try {
    // Check if column exists
    const columns = db.prepare('PRAGMA table_info(users)').all();
    const hasCanLogin = columns.some(col => col.name === 'can_login');

    if (!hasCanLogin) {
        console.log('Adding can_login column...');
        db.exec('ALTER TABLE users ADD COLUMN can_login INTEGER DEFAULT 1');
        console.log('✅ Column added successfully.');
    } else {
        console.log('ℹ️ Column can_login already exists.');
    }

    // Verify
    const verifyCols = db.prepare('PRAGMA table_info(users)').all();
    console.log('Current Schema Columns:', verifyCols.map(c => c.name));

} catch (error) {
    console.error('❌ Migration failed:', error.message);
} finally {
    db.close();
}
