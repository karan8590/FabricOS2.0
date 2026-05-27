import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query(`
            SELECT 
                cd.id, cd.design_name, cd.business_id
            FROM catalog_designs cd
            WHERE cd.business_id = 'business_001'
            ORDER BY cd.created_at DESC LIMIT 20 OFFSET 0
  `);
  console.log(res.rows);
}
run().catch(console.error);
