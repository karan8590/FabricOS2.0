const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Recalculating Invoice Totals...');

// 1. Recalculate from payments
const invoices = db.prepare('SELECT id, amount, status FROM invoices').all();
const updateStmt = db.prepare('UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?');

let updatedCount = 0;

db.transaction(() => {
    for (const inv of invoices) {
        const paidRes = db.prepare('SELECT SUM(amount) as total FROM payments WHERE invoice_id = ?').get(inv.id);
        let paid = paidRes.total || 0;
        let status = inv.status;

        // Legacy fix: If status is 'paid' but no payments recorded, assume paid in full (legacy data)
        if (inv.status === 'paid' && paid === 0) {
            paid = inv.amount;
            console.log(`Fixing legacy invoice ${inv.id}: Setting amount_paid to ${inv.amount}`);
        }

        // Status Logic
        if (paid >= inv.amount) status = 'paid';
        else if (paid > 0) status = 'partial';
        else status = 'unpaid';

        // Update
        updateStmt.run(paid, status, inv.id);
        updatedCount++;
    }
})();

console.log(`✓ Updated ${updatedCount} invoices with correct totals.`);
