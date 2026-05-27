import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const db = getDatabase();

        // 1. Fetch Unified Data
        // Joining Orders with Invoices and then aggregating Payments
        let query = `
            SELECT 
                o.id as order_id,
                o.status as order_status,
                o.quantity_meters,
                o.total_price as order_total,
                o.created_at as order_date,
                c.id as customer_id,
                c.name as customer_name,
                c.phone as customer_phone,
                d.name as design_name,
                i.id as invoice_id,
                i.invoice_number,
                i.status as invoice_status,
                i.due_date,
                (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id) as paid_amount,
                (SELECT MAX(payment_date) FROM payments WHERE invoice_id = i.id) as last_payment_date
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            LEFT JOIN invoices i ON o.id = i.order_id
            WHERE o.business_id = ?
        `;
        const params: any[] = [businessId];

        if (month && year) {
            const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
            const startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
            const endTimestamp = Math.floor(endOfMonth.getTime() / 1000) + 86399;
            query += ' AND COALESCE(o.order_date, o.created_at) >= ? AND COALESCE(o.order_date, o.created_at) <= ?';
            params.push(startTimestamp, endTimestamp);
        }

        query += ' ORDER BY COALESCE(o.order_date, o.created_at) DESC, o.id DESC';

        const rows = (await db.prepare(query).all(...params)) as any[];

        // 2. Process rows to include derived fields
        const processedRows = rows.map(row => {
            const totalAmount = row.order_total || 0;
            const paidAmount = row.paid_amount || 0;
            const pendingAmount = Math.max(0, totalAmount - paidAmount);
            
            return {
                ...row,
                totalAmount,
                paidAmount,
                pendingAmount,
                // Status mapping for UI
                invoiceStatus: row.invoice_status || 'not_generated'
            };
        });

        // 3. Calculate Stats for Widgets
        const stats = {
            pendingProduction: processedRows.filter(r => r.order_status === 'pending' || r.order_status === 'approved').length,
            deliveredOrders: processedRows.filter(r => r.order_status === 'delivered').length,
            outstandingPayments: processedRows.reduce((sum, r) => sum + r.pendingAmount, 0),
            revenueCollected: processedRows.reduce((sum, r) => sum + r.paidAmount, 0)
        };

        return NextResponse.json({
            rows: processedRows,
            stats
        });
    } catch (error) {
        console.error('Operations Ledger fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
