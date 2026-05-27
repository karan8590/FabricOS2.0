const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const bId = 'business_795468';
  
  const orderCount = await client.query("SELECT COUNT(*) FROM orders WHERE business_id = $1 AND status != 'cancelled'", [bId]);
  console.log("Active Order Count:", orderCount.rows[0]);
  
  const invoicesCount = await client.query("SELECT COUNT(*) FROM invoices WHERE business_id = $1", [bId]);
  console.log("Invoices Count:", invoicesCount.rows[0]);
  
  await client.end();
}

run().catch(console.error);
