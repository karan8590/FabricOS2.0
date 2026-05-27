import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import getDatabase from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        let payload: any = null;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
        }

        const customerId = parseInt(params.id);

        if (!payload || payload.type !== 'ledger' || parseInt(payload.targetId) !== customerId) {
            return NextResponse.json({ error: 'Forbidden: Invalid token scope' }, { status: 403 });
        }

        const businessId = payload.businessId;
        const db = getDatabase();

        // 1. Fetch Basic Customer Info
        const customer = (await db.prepare(`
            SELECT * FROM customers WHERE id = ? AND business_id = ?
        `).get(customerId, businessId)) as any;

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // 2. Fetch Orders (Production Workflow)
        const orders = (await db.prepare(`
            SELECT o.*, d.name as design_name, d.price_per_meter
            FROM orders o
            JOIN designs d ON o.design_id = d.id
            WHERE o.customer_id = ? AND o.business_id = ?
            ORDER BY COALESCE(o.order_date, o.created_at) DESC, o.id DESC
        `).all(customerId, businessId)) as any[];

        // 3. Fetch Invoices (Finance Workflow)
        const invoices = (await db.prepare(`
            SELECT i.*, o.id as order_ref_id
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            WHERE i.customer_id = ? AND i.business_id = ?
            ORDER BY i.generated_at DESC
        `).all(customerId, businessId)) as any[];

        // Generate sharing tokens for each invoice
        const invoicesWithTokens = invoices.map(i => {
            const invoiceToken = jwt.sign(
                { type: 'invoice', targetId: i.id.toString(), businessId },
                JWT_SECRET,
                { expiresIn: '365d' }
            );
            return {
                ...i,
                pdfUrl: `/api/public/invoices/${i.id}/pdf?token=${invoiceToken}`
            };
        });

        // 4. Fetch Payments
        const payments = (await db.prepare(`
            SELECT p.*, i.invoice_number
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            WHERE p.customer_id = ? AND p.business_id = ?
            ORDER BY p.payment_date DESC
        `).all(customerId, businessId)) as any[];

        // 5. Fetch Activity Feed
        const activity = (await db.prepare(`
            SELECT * FROM activity
            WHERE customer_id = ? AND business_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(customerId, businessId)) as any[];

        // Calculate workspace metrics
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const overdueAmount = invoices
            .filter(i => i.status === 'overdue' || (i.status === 'unpaid' && i.due_date < Math.floor(Date.now() / 1000)))
            .reduce((sum, i) => sum + i.amount, 0);

        return NextResponse.json({
            customer,
            orders,
            invoices: invoicesWithTokens,
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
        console.error('Public ledger data fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
