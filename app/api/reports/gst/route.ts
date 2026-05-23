import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

// Helper to check authentication
async function getAuthenticatedUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;
        return verifyToken(token);
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

        // Calculate timestamps for start and end of the period
        // For monthly filtering (GSTR-1, GSTR-3B)
        const startDate = Math.floor(new Date(year, month - 1, 1).getTime() / 1000);
        const endDate = Math.floor(new Date(year, month, 1).getTime() / 1000);

        const db = getDatabase();

        // 1. Fetch Settings
        const gstRow = (await db.prepare("SELECT value FROM settings WHERE business_id = $1 AND key = 'gst'").get(user.businessId)) as any;
        const gstConfig = gstRow ? JSON.parse(gstRow.value) : {};

        // 2. Calculate Outward Supplies (Sales/Invoices) summary via SQL
        const salesSummary = (await db.prepare(`
            SELECT 
                COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) as total_tax,
                COALESCE(SUM(cgst_amount), 0) as cgst,
                COALESCE(SUM(sgst_amount), 0) as sgst,
                COALESCE(SUM(igst_amount), 0) as igst
            FROM invoices
            WHERE business_id = $1 AND generated_at >= $2 AND generated_at < $3
        `).get(user.businessId, startDate, endDate)) as any;

        // Fetch paginated sales list for the report (limits memory usage)
        const sales = (await db.prepare(`
            SELECT 
                i.invoice_number, 
                i.generated_at as date, 
                i.taxable_amount, 
                i.gst_rate, 
                i.gst_amount, 
                i.cgst_amount, 
                i.sgst_amount, 
                i.igst_amount, 
                i.gst_type,
                c.name as customer_name, 
                c.gst_no as customer_gstin
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.business_id = $1 AND i.generated_at >= $2 AND i.generated_at < $3
            ORDER BY i.generated_at ASC
            LIMIT 500
        `).all(user.businessId, startDate, endDate));

        // 3. Calculate Inward Supplies (Purchases/Expenses) summary via SQL
        // Note: For expenses, cgst/sgst is calculated by halving the total gst_amount, and igst takes the full gst_amount depending on gst_type
        const purchasesSummary = (await db.prepare(`
            SELECT 
                COALESCE(SUM(gst_amount), 0) as total_tax,
                COALESCE(SUM(CASE WHEN gst_type = 'CGST_SGST' THEN gst_amount / 2 ELSE 0 END), 0) as cgst,
                COALESCE(SUM(CASE WHEN gst_type = 'CGST_SGST' THEN gst_amount / 2 ELSE 0 END), 0) as sgst,
                COALESCE(SUM(CASE WHEN gst_type = 'IGST' THEN gst_amount ELSE 0 END), 0) as igst
            FROM expenses
            WHERE business_id = $1 AND date >= $2 AND date < $3 AND has_gst = 1 AND itc_claimed = 1
        `).get(user.businessId, startDate, endDate)) as any;

        // Fetch paginated purchases list
        const purchases = (await db.prepare(`
            SELECT 
                id, 
                date, 
                description as particular, 
                customerName as vendor_name,
                supplier_gstin, 
                invoice_no,
                taxable_amount, 
                gst_rate, 
                gst_amount, 
                gst_type, 
                itc_claimed,
                amount as total_amount
            FROM expenses
            WHERE business_id = $1 AND date >= $2 AND date < $3 AND has_gst = 1
            ORDER BY date ASC
            LIMIT 500
        `).all(user.businessId, startDate, endDate));

        const summary = {
            output: {
                totalTax: salesSummary.total_tax,
                cgst: salesSummary.cgst,
                sgst: salesSummary.sgst,
                igst: salesSummary.igst
            },
            input: {
                totalTax: purchasesSummary.total_tax,
                cgst: purchasesSummary.cgst,
                sgst: purchasesSummary.sgst,
                igst: purchasesSummary.igst
            },
            liability: {
                netPayable: Math.max(0, salesSummary.total_tax - purchasesSummary.total_tax),
                cgst: Math.max(0, salesSummary.cgst - purchasesSummary.cgst),
                sgst: Math.max(0, salesSummary.sgst - purchasesSummary.sgst),
                igst: Math.max(0, salesSummary.igst - purchasesSummary.igst)
            }
        };

        return NextResponse.json({
            success: true,
            period: { year, month },
            gstConfig,
            summary,
            sales,
            purchases
        });

    } catch (error) {
        console.error('GST Report fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
