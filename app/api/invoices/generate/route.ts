import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { generateInvoicePDFServer } from '@/lib/pdf/generateInvoiceServer';
import { sendTelegramDocument } from '@/lib/telegram';
import { logAction } from '@/lib/auditLogger';
import { calculateOrderFinancials } from '@/lib/financialEngine';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'staff')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { orderId, dueDays } = await request.json();

        if (!orderId || dueDays === undefined) {
            return NextResponse.json(
                { error: 'Order ID and due days are required' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Get order details (including fabric/design category as fabric_type) and customer GST fields
        const order = (await db.prepare(`
            SELECT o.*, d.price_per_meter, d.name as design_name, d.category as fabric_type, 
                   c.name as customer_name, c.phone as customer_phone, c.gstin as customer_gstin, 
                   c.state as customer_state, c.state_code as customer_state_code, c.customer_type
            FROM orders o
            JOIN designs d ON o.design_id = d.id
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ? AND o.business_id = ?
        `).get(orderId, payload.businessId)) as any;

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status === 'delivered' || order.status === 'invoiced') {
            return NextResponse.json({ error: 'Order already processed' }, { status: 400 });
        }

        let sellerName = 'FABRICOS TEXTILES';
        let sellerAddress = 'Plot No. 45-48, Sachin GIDC, Surat, Gujarat - 394230';
        let sellerGstin = '24AAECF1234A1Z0';
        let sellerStateCode = '24';
        let invoicePrefix = 'INV';
        let firmSnapshot = '{}';
        let gstRate = 5;
        let hsnCode = '5407';
        
        // Fetch Firm if order has billing_firm_id
        if (order.billing_firm_id) {
            const firm = (await db.prepare('SELECT * FROM firms WHERE id = ?').get(order.billing_firm_id)) as any;
            if (firm) {
                sellerName = firm.firm_name;
                sellerAddress = firm.address || sellerAddress;
                sellerGstin = firm.gst_number || sellerGstin;
                if (sellerGstin && sellerGstin.length >= 2) {
                    sellerStateCode = sellerGstin.substring(0, 2);
                }
                invoicePrefix = firm.invoice_prefix || invoicePrefix;
                firmSnapshot = JSON.stringify(firm);
            }
            
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            if (gstConfig?.defaultGstRate !== undefined) gstRate = parseFloat(gstConfig.defaultGstRate);
            if (gstConfig?.hsnCode) hsnCode = gstConfig.hsnCode;
        } else {
            // Get global GST settings (legacy fallback)
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            
            sellerName = gstConfig?.legalName || sellerName;
            sellerAddress = gstConfig?.address || sellerAddress;
            sellerGstin = gstConfig?.gstin || sellerGstin;
            sellerStateCode = gstConfig?.stateCode || sellerStateCode;
            firmSnapshot = JSON.stringify(gstConfig || {});
            
            if (gstConfig?.defaultGstRate !== undefined) gstRate = parseFloat(gstConfig.defaultGstRate);
            if (gstConfig?.hsnCode) hsnCode = gstConfig.hsnCode;
        }

        // Calculate dates
        const now = Math.floor(Date.now() / 1000);
        const dueDate = now + (dueDays * 24 * 60 * 60);

        // Use central financial engine
        const financials = calculateOrderFinancials(order);
        const pricePerMeter = order.price_per_unit && order.price_per_unit > 0 ? order.price_per_unit : order.price_per_meter;
        const taxableAmount = financials.subtotal - financials.discount;

        // Compute GST components
        // Gujarat state code is '24'. If customer state code matches billing state code, apply CGST + SGST. Else apply IGST.
        // For B2C or null state code, default to CGST + SGST (local sales).
        const customerStateCode = order.customer_state_code || sellerStateCode;
        const customerState = order.customer_state || 'Gujarat';
        
        let gstType = 'NONE';
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let gstAmount = 0;

        if (gstRate > 0) {
            if (customerStateCode === sellerStateCode) {
                gstType = 'CGST_SGST';
                cgstAmount = parseFloat((taxableAmount * (gstRate / 200)).toFixed(2));
                sgstAmount = parseFloat((taxableAmount * (gstRate / 200)).toFixed(2));
                gstAmount = cgstAmount + sgstAmount;
            } else {
                gstType = 'IGST';
                igstAmount = parseFloat((taxableAmount * (gstRate / 100)).toFixed(2));
                gstAmount = igstAmount;
            }
        }
        
        // Guarantee Invoice Amount equals Final Order Value
        const totalAmount = taxableAmount + gstAmount;

        // Generate Sequential Invoice Number (INV-YYYY-XXXX)
        const currentYear = new Date().getFullYear();
        const prefix = `${invoicePrefix}-${currentYear}-`;
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
            // 1. Create Invoice with complete GST fields
            const invoiceResult = (await db.prepare(`
                INSERT INTO invoices (
                  business_id, invoice_number, customer_id, order_id, amount, status, generated_at, due_date,
                  gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount, hsn_code, taxable_amount, place_of_supply, gst_type,
                  billing_firm_id, firm_snapshot
                ) VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                            payload.businessId,
                            invoiceNumber, 
                            order.customer_id, 
                            order.id, 
                            totalAmount, 
                            now, 
                            dueDate,
                            gstRate,
                            gstAmount,
                            cgstAmount,
                            sgstAmount,
                            igstAmount,
                            hsnCode,
                            taxableAmount,
                            customerState,
                            gstType,
                            order.billing_firm_id || null,
                            firmSnapshot
                        ));

            // 2. Add column if it doesn't exist (silent fail) and update invoice_generated flag
            try {
                await db.prepare('ALTER TABLE orders ADD COLUMN invoice_generated BOOLEAN DEFAULT FALSE').run();
            } catch (e) {}

            (await db.prepare(`
                UPDATE orders SET invoice_generated = TRUE WHERE id = ?
            `).run(orderId));

            // 3. Update Customer Outstanding Balance (inclusive of GST)
            (await db.prepare(`
                UPDATE customers SET outstanding_amount = outstanding_amount + ? WHERE id = ? AND business_id = ?
            `).run(totalAmount, order.customer_id, payload.businessId));

            return invoiceResult.lastInsertRowid;
        });

        const invoiceId = await generateInvoiceTransaction();

        // Audit Logging
        await logAction({
            userId: payload.userId?.toString() || payload.id?.toString() || 'system',
            userName: payload.name || 'System',
            userRole: payload.role || 'system',
            action: 'create_invoice',
            entity: 'invoice',
            entityId: invoiceId.toString(),
            changes: { invoiceNumber, totalAmount, orderId }
        });

        // Generate Premium PDF server-side
        let relativePath = `/api/invoices/${invoiceId}/pdf`;
        let fileBuffer: Buffer | null = null;
        try {
            const pdfResult = await generateInvoicePDFServer({
                invoice_number: invoiceNumber,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone || '',
                customer_gstin: order.customer_gstin || '',
                customer_state: order.customer_state || '',
                customer_state_code: order.customer_state_code || '',
                amount: totalAmount,
                taxable_amount: taxableAmount,
                gst_rate: gstRate,
                gst_amount: gstAmount,
                cgst_amount: cgstAmount,
                sgst_amount: sgstAmount,
                igst_amount: igstAmount,
                hsn_code: hsnCode,
                gst_type: gstType,
                amount_paid: 0,
                status: 'unpaid',
                generated_at: now,
                due_date: dueDate,
                design_name: order.design_name,
                fabric_type: order.fabric_type || 'Printed Fabric',
                quantity_meters: order.quantity_meters,
                price_per_meter: pricePerMeter,
                generated_by: payload.name || 'System',
                seller_name: sellerName,
                seller_address: sellerAddress,
                seller_gstin: sellerGstin
            });
            fileBuffer = pdfResult.buffer;

            // Save PDF path back to invoices table
            (await db.prepare('UPDATE invoices SET pdf_url = ? WHERE id = ? AND business_id = ?').run(relativePath, invoiceId, payload.businessId));
        } catch (pdfError) {
            console.error('Failed to generate PDF invoice:', pdfError);
        }

        // Deliver PDF on Telegram (non-blocking to return response fast)
        if (fileBuffer) {
            const captionText = {
                english: `📄 *Invoice & Delivery Challan Generated*\n\n*Customer*: ${order.customer_name}\n*Invoice*: ${invoiceNumber}\n*Amount*: ₹${totalAmount.toLocaleString('en-IN')}\n*Status*: Unpaid\n\nYour professional invoice PDF is attached below.`,
                gujarati: `📄 *ઇન્વોઇસ અને ડિલિવરી ચલણ જનરેટ થયેલ છે*\n\n*ગ્રાહક*: ${order.customer_name}\n*ઇન્વોઇસ*: ${invoiceNumber}\n*રકમ*: ₹${totalAmount.toLocaleString('en-IN')}\n*સ્થિતિ*: બાકી\n\nતમારું પ્રોફેશનલ ઇન્વોઇસ PDF નીચે સામેલ છે.`
            };

            // Async trigger of Telegram dispatch
            sendTelegramDocument(
                fileBuffer,
                `${invoiceNumber}.pdf`,
                captionText,
                'instant_order_alerts'
            ).then(async (sent) => {
                if (sent) {
                    (await db.prepare('UPDATE invoices SET telegram_delivered = 1, telegram_sent_at = ? WHERE id = ? AND business_id = ?').run(
                                            Math.floor(Date.now() / 1000),
                                            invoiceId,
                                            payload.businessId
                                        ));
                }
            }).catch((err) => {
                console.error('Async Telegram document dispatch failed:', err);
            });
        }

        return NextResponse.json({ success: true, invoiceId, invoiceNumber, pdfUrl: relativePath });

    } catch (error: any) {
        console.error('Invoice generation error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return NextResponse.json(
            { error: `Failed to generate invoice: ${error.message}` },
            { status: 500 }
        );
    }
}
