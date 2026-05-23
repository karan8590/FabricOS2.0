import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // e.g. "2026-05"

        let startTimestamp = 0;
        let endTimestamp = Math.floor(Date.now() / 1000);

        if (month) {
            const [year, monthNum] = month.split('-');
            const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0);
            startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
            endTimestamp = Math.floor(endOfMonth.getTime() / 1000) + 86399;
        }

        const db = getDatabase();

        // Output Tax (Sales)
        const sales = (await db.prepare(`
            SELECT i.id, i.generated_at as date, i.invoice_number, c.name as customerName, i.amount as totalAmount, 
                   i.taxable_amount, i.gst_rate, i.gst_amount, i.cgst_amount, i.sgst_amount, i.igst_amount, i.gst_type, i.hsn_code, i.place_of_supply
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.business_id = ? AND i.generated_at >= ? AND i.generated_at <= ? AND i.gst_type != 'NONE'
            ORDER BY i.generated_at ASC
        `).all(payload.businessId, startTimestamp, endTimestamp));

        // Input Tax (Purchases/Job Work via Cash Book)
        const purchases = (await db.prepare(`
            SELECT id, date, category, description, customerName as vendorName, amount as totalAmount,
                   supplier_gstin, invoice_no, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed
            FROM expenses
            WHERE business_id = ? AND date >= ? AND date <= ? AND has_gst = 1 AND itc_claimed = 1 AND type = 'out'
            ORDER BY date ASC
        `).all(payload.businessId, startTimestamp, endTimestamp));

        // Compute Summaries
        let totalSalesTaxable = 0;
        let totalOutputCGST = 0;
        let totalOutputSGST = 0;
        let totalOutputIGST = 0;

        for (const s of sales as any[]) {
            totalSalesTaxable += (s.taxable_amount || 0);
            totalOutputCGST += (s.cgst_amount || 0);
            totalOutputSGST += (s.sgst_amount || 0);
            totalOutputIGST += (s.igst_amount || 0);
        }

        let totalPurchasesTaxable = 0;
        let totalInputCGST = 0;
        let totalInputSGST = 0;
        let totalInputIGST = 0;

        for (const p of purchases as any[]) {
            totalPurchasesTaxable += (p.taxable_amount || 0);
            const gstAmount = p.gst_amount || 0;
            if (p.gst_type === 'CGST_SGST') {
                totalInputCGST += (gstAmount / 2);
                totalInputSGST += (gstAmount / 2);
            } else if (p.gst_type === 'IGST') {
                totalInputIGST += gstAmount;
            }
        }

        return NextResponse.json({
            sales,
            purchases,
            summary: {
                output: {
                    taxable: totalSalesTaxable,
                    cgst: totalOutputCGST,
                    sgst: totalOutputSGST,
                    igst: totalOutputIGST,
                    totalTax: totalOutputCGST + totalOutputSGST + totalOutputIGST
                },
                input: {
                    taxable: totalPurchasesTaxable,
                    cgst: totalInputCGST,
                    sgst: totalInputSGST,
                    igst: totalInputIGST,
                    totalTax: totalInputCGST + totalInputSGST + totalInputIGST
                },
                liability: {
                    cgst: totalOutputCGST - totalInputCGST,
                    sgst: totalOutputSGST - totalInputSGST,
                    igst: totalOutputIGST - totalInputIGST,
                    netPayable: (totalOutputCGST + totalOutputSGST + totalOutputIGST) - (totalInputCGST + totalInputSGST + totalInputIGST)
                }
            }
        });
    } catch (error) {
        console.error('GST Report fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
