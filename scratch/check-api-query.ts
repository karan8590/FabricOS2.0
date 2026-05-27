import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query(`
            SELECT 
                cd.id, cd.design_name, cd.business_id
            FROM catalog_designs cd
            LEFT JOIN catalog_variants cv ON cv.design_id = cd.id AND cv.status != 'discontinued'
            WHERE cd.business_id = 'business_795468'
            GROUP BY cd.id
            ORDER BY cd.created_at DESC LIMIT 20 OFFSET 0
  `);
  console.log(res.rows);
}
run().catch(console.error);
