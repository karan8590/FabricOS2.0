import { NextResponse } from 'next/server';
import { checkPermission } from '@/lib/auth/permissions';
import getDatabase from '@/lib/db';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('invoices.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status');
        const search = searchParams.get('search');
        const customerId = searchParams.get('customerId');
        const dateStart = searchParams.get('dateStart');
        const dateEnd = searchParams.get('dateEnd');
        const minAmount = searchParams.get('minAmount');
        const maxAmount = searchParams.get('maxAmount');
        const sortBy = searchParams.get('sortBy') || 'generated_at';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const db = getDatabase();
        let query = `
      SELECT 
        invoices.*,
        customers.name as customer_name,
        customers.phone as customer_phone,
        orders.id as order_id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      JOIN orders ON invoices.order_id = orders.id
      WHERE invoices.business_id = ?
    `;
        const params: any[] = [businessId];

        // Filter by status
        if (statusParam && statusParam !== 'all') {
            query += ' AND invoices.status = ?';
            params.push(statusParam);
        }

        // Filter by customer
        if (customerId) {
            query += ' AND invoices.customer_id = ?';
            params.push(parseInt(customerId));
        }

        // Filter by date range
        if (dateStart) {
            query += ' AND invoices.generated_at >= ?';
            params.push(Math.floor(new Date(dateStart).getTime() / 1000));
        }
        if (dateEnd) {
            query += ' AND invoices.generated_at <= ?';
            params.push(Math.floor(new Date(dateEnd).getTime() / 1000) + 86399); // end of day
        }

        // Filter by amount
        if (minAmount) {
            query += ' AND invoices.amount >= ?';
            params.push(parseFloat(minAmount));
        }
        if (maxAmount) {
            query += ' AND invoices.amount <= ?';
            params.push(parseFloat(maxAmount));
        }

        // Search by invoice number or customer name
        if (search) {
            query += ' AND (invoices.invoice_number LIKE ? OR customers.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Add sorting
        const allowedSortColumns = ['invoice_number', 'amount', 'generated_at', 'status'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'generated_at';
        query += ` ORDER BY invoices.${sortColumn} ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;

        const invoices = (await db.prepare(query).all(...params));

        // Check for overdue invoices and compute status
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

        const processedInvoices = invoices.map((invoice: any) => {
            let status = invoice.status;

            // Logic for status display
            const amountPaid = invoice.amount_paid || 0;
            const total = invoice.amount;

            if (amountPaid >= total) {
                status = 'paid';
            } else if (amountPaid > 0) {
                status = 'partial';
            } else if (status === 'unpaid' && invoice.generated_at < thirtyDaysAgo) {
                status = 'overdue';
            }

            return {
                ...invoice,
                status,
                amount_paid: amountPaid,
                last_payment_date: invoice.last_payment_date
            };
        });

        return NextResponse.json({ invoices: processedInvoices });
    } catch (error) {
        console.error('Invoices fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
