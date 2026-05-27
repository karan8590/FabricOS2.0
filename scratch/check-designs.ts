import getDatabase from '../lib/db';
async function run() {
  const db = getDatabase();
  const res = await db.query('SELECT id, design_name, business_id FROM catalog_designs ORDER BY created_at DESC LIMIT 5');
  console.log('Designs:', res.rows);
  
  const variantsRes = await db.query('SELECT id, design_id, color_name FROM catalog_variants ORDER BY created_at DESC LIMIT 5');
  console.log('Variants:', variantsRes.rows);
}
run().catch(console.error);
