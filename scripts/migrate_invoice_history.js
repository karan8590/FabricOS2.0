const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating invoice_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_history (
          id SERIAL PRIMARY KEY,
          business_id TEXT DEFAULT 'business_001',
          invoice_id INTEGER NOT NULL,
          action_type TEXT NOT NULL,
          description TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Creating index on invoice_history(invoice_id)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_history_inv ON invoice_history(invoice_id);
    `);

    // Backfill history for existing invoices (so they have at least a "Generated" event)
    console.log('Backfilling initial generation events for existing invoices...');
    await client.query(`
      INSERT INTO invoice_history (invoice_id, action_type, description, metadata, created_at)
      SELECT id, 'Invoice Generated', 'Invoice auto-backfilled by system', '{}', generated_at
      FROM invoices
      WHERE id NOT IN (SELECT invoice_id FROM invoice_history WHERE action_type = 'Invoice Generated');
    `);

    await client.query('COMMIT');
    console.log('Migration successful.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
