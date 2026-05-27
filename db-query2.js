const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const sumOrders = await client.query("SELECT SUM(total_price) as total FROM orders WHERE status != 'cancelled'");
  console.log("Orders sum:", sumOrders.rows[0]);
  
  const sumInvoices = await client.query("SELECT SUM(amount) as total, SUM(gst_amount) as tax, SUM(taxable_amount) as base FROM invoices");
  console.log("Invoices sum:", sumInvoices.rows[0]);
  
  const duplicateInvoices = await client.query("SELECT order_id, COUNT(*) as count FROM invoices GROUP BY order_id HAVING COUNT(*) > 1");
  console.log("Duplicate Invoices for same order_id:", duplicateInvoices.rows);
  
  await client.end();
}

run().catch(console.error);
