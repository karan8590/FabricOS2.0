import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, user, error, status } = await checkPermission('customers.view');
        const customerId = parseInt(params.id);

        // Security override: If user is a customer, they can only view THEIR OWN workspace
        const isSelf = user?.role === 'customer' && user.customerId === customerId;
        
        if (!authorized && !isSelf) {
            return NextResponse.json({ error }, { status });
        }

        const db = getDatabase();

        // 1. Fetch Basic Customer Info
        const customer = (await db.prepare(`
            SELECT * FROM customers WHERE id = ?
        `).get(customerId)) as any;

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // 2. Fetch Orders (Production Workflow)
        const orders = (await db.prepare(`
            SELECT o.*, d.name as design_name, d.price_per_meter
            FROM orders o
            JOIN designs d ON o.design_id = d.id
            WHERE o.customer_id = ?
            ORDER BY o.created_at DESC
        `).all(customerId)) as any[];

        // 3. Fetch Invoices (Finance Workflow)
        const invoices = (await db.prepare(`
            SELECT i.*, o.id as order_ref_id
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            WHERE i.customer_id = ?
            ORDER BY i.generated_at DESC
        `).all(customerId)) as any[];

        // 4. Fetch Payments
        const payments = (await db.prepare(`
            SELECT p.*, i.invoice_number
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            WHERE p.customer_id = ?
            ORDER BY p.payment_date DESC
        `).all(customerId)) as any[];

        // 5. Fetch Activity Feed
        const activity = (await db.prepare(`
            SELECT * FROM activity
            WHERE customer_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(customerId)) as any[];

        // Calculate workspace metrics
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const overdueAmount = invoices
            .filter(i => i.status === 'overdue' || (i.status === 'unpaid' && i.due_date < Math.floor(Date.now() / 1000)))
            .reduce((sum, i) => sum + i.amount, 0);

        return NextResponse.json({
            customer,
            orders,
            invoices,
            payments,
            activity,
            metrics: {
                lifetimeRevenue: customer.ltv || 0,
                outstandingDue: customer.outstanding_amount || 0,
                totalOrders: customer.total_orders || 0,
                totalPaid,
                overdueAmount,
                riskLevel: customer.behavior || 'New'
            }
        });
    } catch (error) {
        console.error('Workspace fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
