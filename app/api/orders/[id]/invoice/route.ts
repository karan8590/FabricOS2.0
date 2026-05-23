import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
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
        const orderId = parseInt(params.id);
        const db = getDatabase();

        // Get order details (including fabric/design category as fabric_type)
        const order = (await db.prepare(`
            SELECT o.*, d.price_per_meter, d.name as design_name, d.category as fabric_type, c.name as customer_name, c.phone as customer_phone
            FROM orders o
            JOIN designs d ON o.design_id = d.id
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `).get(orderId)) as any;

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status === 'delivered' || order.status === 'invoiced') {
            return NextResponse.json({ error: 'Order already processed' }, { status: 400 });
        }

        // Calculate dates
        const now = Math.floor(Date.now() / 1000);
        const dueDate = now + (7 * 24 * 60 * 60); // Default 7 days payment terms

        // Calculate amount prioritizing custom price/rate from order
        const pricePerMeter = order.price_per_unit && order.price_per_unit > 0 ? order.price_per_unit : order.price_per_meter;
        const amount = order.total_price && order.total_price > 0 ? order.total_price : (order.quantity_meters * pricePerMeter);

        // Generate Sequential Invoice Number (INV-YYYY-XXXX)
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;
        const lastInvoice = (await db.prepare(`
            SELECT invoice_number FROM invoices 
            WHERE invoice_number LIKE ? 
            ORDER BY id DESC LIMIT 1
        `).get(`${prefix}%`)) as { invoice_number: string } | undefined;

        let nextNum = 1;
        if (lastInvoice) {
            const parts = lastInvoice.invoice_number.split('-');
            if (parts.length === 3) {
                const lastNum = parseInt(parts[2], 10);
                if (!isNaN(lastNum)) {
                    nextNum = lastNum + 1;
                }
            }
        }
        const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

        // Start transaction
        const generateInvoiceTransaction = db.transaction(async () => {
            // 1. Create Invoice
            const invoiceResult = (await db.prepare(`
                INSERT INTO invoices (
                  invoice_number, customer_id, order_id, amount, status, generated_at, due_date
                ) VALUES (?, ?, ?, ?, 'unpaid', ?, ?)
            `).run(invoiceNumber, order.customer_id, order.id, amount, now, dueDate));

            // 2. Update Order Status to 'invoiced'
            (await db.prepare(`
                UPDATE orders SET status = 'invoiced', completed_at = ? WHERE id = ?
            `).run(now, orderId));

            // 3. Update Customer Outstanding Balance
            (await db.prepare(`
                UPDATE customers SET outstanding_amount = outstanding_amount + ? WHERE id = ?
            `).run(amount, order.customer_id));

            return invoiceResult.lastInsertRowid;
        });

        const invoiceId = generateInvoiceTransaction();

        // Generate Premium PDF server-side
        let relativePath = `/api/invoices/${invoiceId}/pdf`;
        let fileBuffer: Buffer | null = null;
        try {
            const pdfResult = await generateInvoicePDFServer({
                invoice_number: invoiceNumber,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone || '',
                amount: amount,
                amount_paid: 0,
                status: 'unpaid',
                generated_at: now,
                due_date: dueDate,
                design_name: order.design_name,
                fabric_type: order.fabric_type || 'Printed Fabric',
                quantity_meters: order.quantity_meters,
                price_per_meter: pricePerMeter,
                generated_by: payload.name || 'System'
            });
            fileBuffer = pdfResult.buffer;

            // Save PDF path back to invoices table
            (await db.prepare('UPDATE invoices SET pdf_url = ? WHERE id = ?').run(relativePath, invoiceId));
        } catch (pdfError) {
            console.error('Failed to generate PDF invoice:', pdfError);
        }

        // Deliver PDF on Telegram (non-blocking)
        if (fileBuffer) {
            const captionText = {
                english: `📄 *Invoice & Delivery Challan Generated*\n\n*Customer*: ${order.customer_name}\n*Invoice*: ${invoiceNumber}\n*Amount*: ₹${amount.toLocaleString('en-IN')}\n*Status*: Unpaid\n\nYour professional invoice PDF is attached below.`,
                gujarati: `📄 *ઇન્વોઇસ અને ડિલિવરી ચલણ જનરેટ થયેલ છે*\n\n*ગ્રાહક*: ${order.customer_name}\n*ઇન્વોઇસ*: ${invoiceNumber}\n*રકમ*: ₹${amount.toLocaleString('en-IN')}\n*સ્થિતિ*: બાકી\n\nતમારું પ્રોફેશનલ ઇન્વોઇસ PDF નીચે સામેલ છે.`
            };

            sendTelegramDocument(
                fileBuffer,
                `${invoiceNumber}.pdf`,
                captionText,
                'instant_order_alerts'
            ).then(async (sent) => {
                if (sent) {
                    (await db.prepare('UPDATE invoices SET telegram_delivered = 1, telegram_sent_at = ? WHERE id = ?').run(
                                            Math.floor(Date.now() / 1000),
                                            invoiceId
                                        ));
                }
            }).catch((err) => {
                console.error('Async Telegram document dispatch failed:', err);
            });
        }

        return NextResponse.json({
            success: true,
            invoiceId,
            invoiceNumber,
            pdfUrl: relativePath
        });
    } catch (error) {
        console.error('Generate invoice error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
