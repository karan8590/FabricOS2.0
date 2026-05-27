const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const bId = 'business_795468';

  const sumOrdersByStatus = await client.query("SELECT status, SUM(total_price) as total FROM orders WHERE business_id = $1 GROUP BY status", [bId]);
  console.log("Orders sum by status:", sumOrdersByStatus.rows);
  
  const sumInvoicedOrders = await client.query("SELECT SUM(total_price) as total FROM orders WHERE business_id = $1 AND id IN (SELECT order_id FROM invoices WHERE business_id = $1)", [bId]);
  console.log("Sum of Orders that have an invoice:", sumInvoicedOrders.rows[0]);
  
  const currentMonthSum = await client.query("SELECT SUM(total_price) as total FROM orders WHERE business_id = $1 AND status != 'cancelled' AND (EXTRACT(MONTH FROM to_timestamp(COALESCE(order_date, created_at))) = EXTRACT(MONTH FROM CURRENT_DATE))", [bId]);
  console.log("Current month orders sum:", currentMonthSum.rows[0]);
  
  await client.end();
}

run().catch(console.error);
