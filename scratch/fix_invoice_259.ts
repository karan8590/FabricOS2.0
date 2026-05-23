import Database from 'better-sqlite3';
import { join } from 'path';
import { generateInvoicePDFServer } from '../lib/pdf/generateInvoiceServer';

async function run() {
    const dbPath = join(process.cwd(), 'data', 'fabricos.db');
    const db = new Database(dbPath);

    console.log('Fetching invoice 259 details...');
    const invoice = db.prepare(`
        SELECT i.*, o.quantity_meters, o.total_price, o.price_per_unit, d.price_per_meter, d.name as design_name, d.category as fabric_type, c.name as customer_name, c.phone as customer_phone
        FROM invoices i
        JOIN orders o ON i.order_id = o.id
        JOIN designs d ON o.design_id = d.id
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = 259
    `).get() as any;

    if (!invoice) {
        console.error('Invoice 259 not found in database!');
        return;
    }

    const oldAmount = invoice.amount;
    const pricePerMeter = invoice.price_per_unit && invoice.price_per_unit > 0 ? invoice.price_per_unit : invoice.price_per_meter;
    const newAmount = invoice.total_price && invoice.total_price > 0 ? invoice.total_price : (invoice.quantity_meters * pricePerMeter);

    console.log(`Current DB values:`);
    console.log(`- Invoice Number: ${invoice.invoice_number}`);
    console.log(`- Amount in DB: ${oldAmount}`);
    console.log(`- Expected New Amount: ${newAmount}`);
    console.log(`- Price per Meter: ${pricePerMeter}`);

    // Update DB
    console.log('Updating database entries...');
    const updateTx = db.transaction(() => {
        db.prepare('UPDATE invoices SET amount = ? WHERE id = 259').run(newAmount);
        
        if (oldAmount !== newAmount) {
            const diff = newAmount - oldAmount;
            console.log(`Adjusting customer outstanding amount by +${diff}...`);
            db.prepare('UPDATE customers SET outstanding_amount = outstanding_amount + ? WHERE id = ?').run(diff, invoice.customer_id);
        }
    });
    updateTx();

    console.log('Regenerating PDF invoice...');
    const pdfResult = await generateInvoicePDFServer({
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone || '',
        amount: newAmount,
        amount_paid: invoice.amount_paid || 0,
        status: invoice.status,
        generated_at: invoice.generated_at,
        due_date: invoice.due_date,
        design_name: invoice.design_name,
        fabric_type: invoice.fabric_type || 'Printed Fabric',
        quantity_meters: invoice.quantity_meters,
        price_per_meter: pricePerMeter,
        generated_by: 'System (Fix Script)'
    });

    db.prepare('UPDATE invoices SET pdf_url = ? WHERE id = 259').run(pdfResult.relativePath);

    console.log(`Successfully updated invoice 259 and saved PDF to ${pdfResult.relativePath}!`);
}

run().catch(console.error);
