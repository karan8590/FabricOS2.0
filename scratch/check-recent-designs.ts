import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query('SELECT id, design_name, business_id, created_at FROM catalog_designs ORDER BY created_at DESC LIMIT 5');
  console.log(res.rows);
}
run().catch(console.error);
