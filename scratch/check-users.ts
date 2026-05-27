import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query('SELECT id, name, role, business_id FROM users ORDER BY id ASC LIMIT 5');
  console.log(res.rows);
}
run().catch(console.error);
