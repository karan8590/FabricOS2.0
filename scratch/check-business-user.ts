import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query("SELECT * FROM users WHERE business_id = 'business_795468'");
  console.log(res.rows);
}
run().catch(console.error);
