const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  // For current month (May 2026)
  const mayStart = new Date(2026, 4, 1).getTime() / 1000;
  const mayEnd = new Date(2026, 5, 0).getTime() / 1000 + 86399; // May 31

  const sumOrders = await client.query("SELECT SUM(total_price) as total FROM orders WHERE status != 'cancelled' AND (order_date >= $1 AND order_date <= $2 OR (order_date IS NULL AND created_at >= $1 AND created_at <= $2))", [mayStart, mayEnd]);
  console.log("May Orders sum:", sumOrders.rows[0]);
  
  const sumInvoices = await client.query("SELECT SUM(amount) as total, SUM(gst_amount) as tax, SUM(taxable_amount) as base FROM invoices WHERE generated_at >= $1 AND generated_at <= $2", [mayStart, mayEnd]);
  console.log("May Invoices sum:", sumInvoices.rows[0]);
  
  await client.end();
}

run().catch(console.error);
