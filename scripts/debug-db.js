const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('--- Invoices ---');
const invoices = db.prepare('SELECT id, invoice_number, amount, amount_paid, status FROM invoices LIMIT 5').all();
console.table(invoices);

console.log('\n--- Payments ---');
const payments = db.prepare('SELECT * FROM payments').all();
console.table(payments);

if (payments.length === 0) {
    console.log('\n⚠️ No payments found in the database. The user might not have successfully recorded a payment yet.');
} else {
    // Check if invoice amount_paid matches payment sum
    console.log('\n--- Verification ---');
    payments.forEach(p => {
        const inv = invoices.find(i => i.id === p.invoice_id);
        if (inv) {
            console.log(`Invoice ${inv.invoice_number}: Paid ${p.amount}, Invoice says ${inv.amount_paid}`);
        } else {
            console.log(`Payment ${p.id} references missing invoice ${p.invoice_id}`);
        }
    });
}
