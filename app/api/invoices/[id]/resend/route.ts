import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { join } from 'path';
import { generateInvoicePDFServer } from '@/lib/pdf/generateInvoiceServer';
import { sendTelegramDocument } from '@/lib/telegram';

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role === 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const invoiceId = parseInt(params.id);
        const db = getDatabase();

        // Get invoice details joined with order and customer info
        const invoice = (await db.prepare(`
            SELECT i.*, o.quantity_meters, o.total_price, o.price_per_unit, d.price_per_meter, d.name as design_name, d.category as fabric_type, c.name as customer_name, c.phone as customer_phone
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN designs d ON o.design_id = d.id
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = ?
        `).get(invoiceId)) as any;

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const oldAmount = invoice.amount;
        const pricePerMeter = invoice.price_per_unit && invoice.price_per_unit > 0 ? invoice.price_per_unit : invoice.price_per_meter;
        const amount = invoice.total_price && invoice.total_price > 0 ? invoice.total_price : (invoice.quantity_meters * pricePerMeter);

        let sellerName = 'FABRICOS TEXTILES';
        let sellerAddress = 'Plot No. 45-48, Sachin GIDC, Surat, Gujarat - 394230';
        let sellerGstin = '24AAECF1234A1Z0';
        let sellerStateCode = '24';
        
        if (invoice.firm_snapshot) {
            try {
                const firm = JSON.parse(invoice.firm_snapshot);
                if (firm.firm_name) sellerName = firm.firm_name;
                else if (firm.legalName) sellerName = firm.legalName;
                if (firm.address) sellerAddress = firm.address;
                if (firm.gst_number) sellerGstin = firm.gst_number;
                else if (firm.gstin) sellerGstin = firm.gstin;
                if (sellerGstin && sellerGstin.length >= 2) sellerStateCode = sellerGstin.substring(0, 2);
                else if (firm.stateCode) sellerStateCode = firm.stateCode;
            } catch (e) { console.error('Failed to parse firm_snapshot', e); }
        } else {
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            sellerName = gstConfig?.legalName || sellerName;
            sellerAddress = gstConfig?.address || sellerAddress;
            sellerGstin = gstConfig?.gstin || sellerGstin;
            sellerStateCode = gstConfig?.stateCode || sellerStateCode;
        }

        // Regenerate on-the-fly
        const pdfResult = await generateInvoicePDFServer({
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone || '',
            amount: amount,
            amount_paid: invoice.amount_paid || 0,
            status: invoice.status,
            generated_at: invoice.generated_at,
            due_date: invoice.due_date,
            design_name: invoice.design_name,
            fabric_type: invoice.fabric_type || 'Printed Fabric',
            quantity_meters: invoice.quantity_meters,
            price_per_meter: pricePerMeter,
            seller_name: sellerName,
            seller_address: sellerAddress,
            seller_gstin: sellerGstin,
            generated_by: 'System (Regenerated)'
        });
        const fileBuffer = pdfResult.buffer;
        
        const relativePath = `/api/invoices/${invoiceId}/pdf`;
        
        // Save path and amount back to DB inside transaction
        const updateTransaction = db.transaction(async () => {
            (await db.prepare('UPDATE invoices SET pdf_url = ?, amount = ? WHERE id = ?').run(relativePath, amount, invoiceId));
            if (oldAmount !== amount) {
                const diff = amount - oldAmount;
                (await db.prepare('UPDATE customers SET outstanding_amount = outstanding_amount + ? WHERE id = ?').run(diff, invoice.customer_id));
            }
        });
        await updateTransaction();
        
        // Update invoice.amount for caption rendering below
        invoice.amount = amount;

        // Construct caption
        const captionText = {
            english: `📄 *Invoice & Delivery Challan Dispatch*\n\n*Customer*: ${invoice.customer_name}\n*Invoice*: ${invoice.invoice_number}\n*Amount*: ₹${invoice.amount.toLocaleString('en-IN')}\n*Status*: ${invoice.status.toUpperCase()}\n\nYour professional invoice PDF is attached below.`,
            gujarati: `📄 *ઇન્વોઇસ અને ડિલિવરી ચલણ રવાનગી*\n\n*ગ્રાહક*: ${invoice.customer_name}\n*ઇન્વોઇસ*: ${invoice.invoice_number}\n*રકમ*: ₹${invoice.amount.toLocaleString('en-IN')}\n*સ્થિતિ*: ${invoice.status.toUpperCase()}\n\nતમારું પ્રોફેશનલ ઇન્વોઇસ PDF નીચે સામેલ છે.`
        };

        const sent = await sendTelegramDocument(
            fileBuffer,
            fileName,
            captionText,
            'instant_order_alerts'
        );

        if (sent) {
            (await db.prepare('UPDATE invoices SET telegram_delivered = 1, telegram_sent_at = ? WHERE id = ?').run(
                            Math.floor(Date.now() / 1000),
                            invoiceId
                        ));
            return NextResponse.json({ success: true, message: 'Invoice PDF resent successfully via Telegram' });
        } else {
            return NextResponse.json({ error: 'Failed to dispatch document to any active recipients on Telegram. Ensure bot is configured and recipients are active.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Resend invoice error:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error.message}` },
            { status: 500 }
        );
    }
}
