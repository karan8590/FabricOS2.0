import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { generateInvoicePDFServer } from '@/lib/pdf/generateInvoiceServer';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const params = await context.params;
        const invoiceId = parseInt(params.id);
        const db = getDatabase();

        // Get invoice details joined with order and customer info
        const invoice = (await db.prepare(`
            SELECT i.*, o.quantity_meters, o.total_price, o.price_per_unit, d.price_per_meter, d.name as design_name, d.category as fabric_type, c.name as customer_name, c.phone as customer_phone, c.gstin as customer_gstin, c.state as customer_state, c.state_code as customer_state_code
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN designs d ON o.design_id = d.id
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = ?
        `).get(invoiceId)) as any;

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }
        
        // Security check: Customer can only view their own invoice
        if (payload.role === 'customer' && invoice.customer_id !== payload.id) {
             return new NextResponse('Forbidden', { status: 403 });
        }

        const pricePerMeter = invoice.price_per_unit && invoice.price_per_unit > 0 ? invoice.price_per_unit : invoice.price_per_meter;
        const amount = invoice.amount; // Use the stored amount

        let sellerName = 'FABRICOS TEXTILES';
        let sellerAddress = 'Plot No. 45-48, Sachin GIDC, Surat, Gujarat - 394230';
        let sellerGstin = '24AAECF1234A1Z0';
        let sellerStateCode = '24';
        let gstRate = 5;
        let hsnCode = '5407';

        if (invoice.firm_snapshot) {
            try {
                const firm = JSON.parse(invoice.firm_snapshot);
                if (firm.firm_name) sellerName = firm.firm_name;
                else if (firm.legalName) sellerName = firm.legalName; // fallback to legacy
                
                if (firm.address) sellerAddress = firm.address;
                if (firm.gst_number) sellerGstin = firm.gst_number;
                else if (firm.gstin) sellerGstin = firm.gstin; // fallback to legacy
                
                if (sellerGstin && sellerGstin.length >= 2) {
                    sellerStateCode = sellerGstin.substring(0, 2);
                } else if (firm.stateCode) {
                    sellerStateCode = firm.stateCode;
                }
                
                if (firm.defaultGstRate !== undefined) gstRate = parseFloat(firm.defaultGstRate);
                if (firm.hsnCode) hsnCode = firm.hsnCode;
            } catch (e) {
                console.error('Failed to parse firm_snapshot', e);
            }
        } else {
            // Get global GST settings (legacy)
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            
            sellerName = gstConfig?.legalName || sellerName;
            sellerAddress = gstConfig?.address || sellerAddress;
            sellerGstin = gstConfig?.gstin || sellerGstin;
            sellerStateCode = gstConfig?.stateCode || sellerStateCode;
            
            gstRate = gstConfig?.defaultGstRate !== undefined ? parseFloat(gstConfig.defaultGstRate) : 5;
            hsnCode = gstConfig?.hsnCode || '5407';
        }
        
        const taxableAmount = invoice.total_price && invoice.total_price > 0 ? invoice.total_price : (invoice.quantity_meters * pricePerMeter);
        
        const customerStateCode = invoice.customer_state_code || sellerStateCode;
        
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

        // Regenerate on-the-fly
        const pdfResult = await generateInvoicePDFServer({
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone || '',
            customer_gstin: invoice.customer_gstin || '',
            customer_state: invoice.customer_state || '',
            customer_state_code: invoice.customer_state_code || '',
            amount: amount,
            taxable_amount: taxableAmount,
            gst_rate: gstRate,
            gst_amount: gstAmount,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: igstAmount,
            hsn_code: hsnCode,
            gst_type: gstType,
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
            generated_by: 'System'
        });
        
        return new NextResponse(pdfResult.buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
                'Cache-Control': 'public, max-age=86400, immutable'
            }
        });

    } catch (error: any) {
        console.error('Fetch invoice PDF error:', error);
        return new NextResponse(`Internal server error: ${error.message}`, { status: 500 });
    }
}
