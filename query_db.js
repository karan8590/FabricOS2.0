const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres' });
pool.query('SELECT id, name, category, available_stock, reserved_stock, used_stock, rate_per_unit FROM inventory_materials', (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
