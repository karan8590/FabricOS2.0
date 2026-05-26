const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres' });
pool.query('SELECT id, name, vendor_type, contact, material_supplied FROM vendors', (err, res) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
