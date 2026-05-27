const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const sumOrders = await client.query("SELECT business_id, SUM(total_price) as total FROM orders WHERE status != 'cancelled' GROUP BY business_id");
  console.log("Orders sum by business:", sumOrders.rows);
  
  const sumInvoices = await client.query("SELECT business_id, SUM(amount) as total, SUM(gst_amount) as tax, SUM(taxable_amount) as base FROM invoices GROUP BY business_id");
  console.log("Invoices sum by business:", sumInvoices.rows);
  
  await client.end();
}

run().catch(console.error);
