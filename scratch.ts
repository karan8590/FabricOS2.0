import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE catalog_designs ALTER COLUMN business_id TYPE TEXT USING business_id::text;
      ALTER TABLE catalog_variants ALTER COLUMN business_id TYPE TEXT USING business_id::text;
    `);
    console.log("Tables altered successfully");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    pool.end();
  }
}
run();
