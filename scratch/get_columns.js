require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function getCols() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';");
  console.log(res.rows);
  process.exit(0);
}
getCols();
