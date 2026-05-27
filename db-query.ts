import { config } from 'dotenv';
config({ path: '.env.local' });
import getDatabase from './lib/db/index';

async function run() {
  const db = getDatabase();
  const res = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices';");
  console.log("Invoice Schema:", res);
  
  const sumOrders = await db.get("SELECT SUM(total_price) as total FROM orders WHERE status != 'cancelled'");
  console.log("Orders sum:", sumOrders);
  
  const sumInvoices = await db.get("SELECT SUM(amount) as total, SUM(gst_amount) as tax, SUM(taxable_amount) as base FROM invoices");
  console.log("Invoices sum:", sumInvoices);
  
  const sumCancelledOrders = await db.get("SELECT SUM(total_price) as total FROM orders WHERE status = 'cancelled'");
  console.log("Cancelled orders sum:", sumCancelledOrders);

  // Any duplicate order invoices?
  const duplicateInvoices = await db.all("SELECT order_id, COUNT(*) as count FROM invoices GROUP BY order_id HAVING COUNT(*) > 1");
  console.log("Duplicate Invoices for same order_id:", duplicateInvoices);
  
  process.exit(0);
}

run();
