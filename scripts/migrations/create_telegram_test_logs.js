const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../fabric_os.db');
const db = new sqlite3(dbPath);

function migrate() {
    console.log('Creating telegram_test_logs table...');
    
    // Create the table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS telegram_test_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_id INTEGER,
            recipient_id INTEGER,
            message_type TEXT,
            status TEXT,
            error TEXT,
            sent_at INTEGER
        );
    `).run();

    console.log('Migration completed successfully.');
}

migrate();
