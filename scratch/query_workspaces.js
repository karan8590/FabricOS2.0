const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres' });
async function check() {
  const ws = await pool.query('SELECT * FROM workspaces');
  console.log('Workspaces:', ws.rows);
  const fr = await pool.query('SELECT * FROM firms');
  console.log('Firms:', fr.rows);
  pool.end();
}
check();
