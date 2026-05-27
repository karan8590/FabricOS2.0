import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'catalog_designs'");
  console.log(res.rows);
}
run().catch(console.error);
