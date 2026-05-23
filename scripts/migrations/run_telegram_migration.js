const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS telegram_test_logs (
                id SERIAL PRIMARY KEY,
                business_id INTEGER,
                recipient_id INTEGER,
                message_type TEXT,
                status TEXT,
                error TEXT,
                sent_at INTEGER
            );
        `);
        console.log('Successfully created telegram_test_logs');
    } catch (e) {
        console.error('Error creating table:', e);
    } finally {
        await pool.end();
    }
}

migrate();
