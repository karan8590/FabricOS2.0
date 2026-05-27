require('dotenv').config({ path: '.env.local' });
const { getDatabase } = require('./lib/db/index');

async function run() {
  const db = getDatabase();
  const res = await db.prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices';").all();
  console.log("Invoice Schema:", res);
  
  const sumOrders = await db.prepare("SELECT SUM(total_price) as total FROM orders WHERE status != 'cancelled'").get();
  console.log("Orders sum:", sumOrders);
  
  const sumInvoices = await db.prepare("SELECT SUM(amount) as total, SUM(gst_amount) as tax, SUM(taxable_amount) as base FROM invoices").get();
  console.log("Invoices sum:", sumInvoices);
  
  const sumCancelledOrders = await db.prepare("SELECT SUM(total_price) as total FROM orders WHERE status = 'cancelled'").get();
  console.log("Cancelled orders sum:", sumCancelledOrders);

  // Any duplicate order invoices?
  const duplicateInvoices = await db.prepare("SELECT order_id, COUNT(*) as count FROM invoices GROUP BY order_id HAVING COUNT(*) > 1").all();
  console.log("Duplicate Invoices for same order_id:", duplicateInvoices);
  
  process.exit(0);
}

run();
