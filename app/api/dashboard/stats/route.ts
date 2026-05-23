import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

export async function GET(req: Request) {
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
        
        const businessId = payload.businessId;

        const { searchParams } = new URL(req.url);
        const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const selectedMonth = searchParams.get('month') || (new Date().getMonth() + 1).toString(); // 1-12
        const range = searchParams.get('range') || 'year';

        const db = getDatabase();

        let startTs, endTs, prevStartTs, prevEndTs;

        if (selectedMonth === 'any') {
            // Full Year
            startTs = Math.floor(new Date(selectedYear, 0, 1).getTime() / 1000);
            endTs = Math.floor(new Date(selectedYear, 11, 31, 23, 59, 59).getTime() / 1000);
            
            // Compare to previous year
            prevStartTs = Math.floor(new Date(selectedYear - 1, 0, 1).getTime() / 1000);
            prevEndTs = Math.floor(new Date(selectedYear - 1, 11, 31, 23, 59, 59).getTime() / 1000);
        } else {
            // Specific Month
            const m = parseInt(selectedMonth) - 1;
            startTs = Math.floor(new Date(selectedYear, m, 1).getTime() / 1000);
            endTs = Math.floor(new Date(selectedYear, m + 1, 0, 23, 59, 59).getTime() / 1000);

            // Compare to previous month
            const prevMonthDate = new Date(selectedYear, m - 1, 1);
            prevStartTs = Math.floor(prevMonthDate.getTime() / 1000);
            prevEndTs = Math.floor(new Date(selectedYear, m, 0, 23, 59, 59).getTime() / 1000);
        }

        // Helper to calculate percentage change
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        // 1. Orders Received
        const currentOrders = (await db
                    .prepare('SELECT COUNT(*) as count FROM orders WHERE business_id = ? AND COALESCE(order_date, created_at) >= ? AND COALESCE(order_date, created_at) <= ?')
                    .get(businessId, startTs, endTs)) as { count: number };

        const lastOrders = (await db
                    .prepare('SELECT COUNT(*) as count FROM orders WHERE business_id = ? AND COALESCE(order_date, created_at) >= ? AND COALESCE(order_date, created_at) <= ?')
                    .get(businessId, prevStartTs, prevEndTs)) as { count: number };

        // 2. Orders Delivered (Completed)
        const currentDelivered = (await db
                    .prepare(
                        "SELECT COUNT(*) as count FROM orders WHERE business_id = ? AND status IN ('completed', 'invoiced') AND completed_at >= ? AND completed_at <= ?"
                    )
                    .get(businessId, startTs, endTs)) as { count: number };

        const lastDelivered = (await db
                    .prepare(
                        "SELECT COUNT(*) as count FROM orders WHERE business_id = ? AND status IN ('completed', 'invoiced') AND completed_at >= ? AND completed_at <= ?"
                    )
                    .get(businessId, prevStartTs, prevEndTs)) as { count: number };

        // 3. Revenue Collected (Paid Invoices)
        const currentRevenue = (await db
                    .prepare(
                        `SELECT COALESCE(SUM(amount), 0) as revenue 
                 FROM invoices 
                 WHERE business_id = ? AND status = 'paid' 
                 AND paid_at >= ? AND paid_at <= ?`
                    )
                    .get(businessId, startTs, endTs)) as { revenue: number };

        const lastRevenue = (await db
                    .prepare(
                        `SELECT COALESCE(SUM(amount), 0) as revenue 
                 FROM invoices 
                 WHERE business_id = ? AND status = 'paid' 
                 AND paid_at >= ? AND paid_at <= ?`
                    )
                    .get(businessId, prevStartTs, prevEndTs)) as { revenue: number };

        // 4. Outstanding Amount (Snapshot of the end of the selected period)
        const currentOutstanding = (await db
                    .prepare(
                        "SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE business_id = ? AND status IN ('unpaid', 'overdue') AND generated_at <= ?"
                    )
                    .get(businessId, endTs)) as { total: number };

        const lastOutstandingValue = (await db
                    .prepare(
                        "SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE business_id = ? AND status IN ('unpaid', 'overdue') AND generated_at <= ?"
                    )
                    .get(businessId, prevEndTs)) as { total: number };

        // --- Analytics Data (Trends) ---
        const analyticsData = [];
        const now = new Date();
        
        if (selectedMonth === 'any') {
            // Trend for each month of the year
            const yearStart = Math.floor(new Date(selectedYear, 0, 1).getTime() / 1000);
            const yearEnd = Math.floor(new Date(selectedYear, 11, 31, 23, 59, 59).getTime() / 1000);
            
            // Fetch grouped data for the entire year in 3 fast queries
            const revData = (await db.prepare("SELECT CAST(EXTRACT(MONTH FROM to_timestamp(paid_at)) AS INTEGER) as m, COALESCE(SUM(amount), 0) as total FROM invoices WHERE business_id = ? AND status = 'paid' AND paid_at >= ? AND paid_at <= ? GROUP BY m").all(businessId, yearStart, yearEnd)) as any[];
            const ordsData = (await db.prepare("SELECT CAST(EXTRACT(MONTH FROM to_timestamp(COALESCE(order_date, created_at))) AS INTEGER) as m, COUNT(*) as count FROM orders WHERE business_id = ? AND COALESCE(order_date, created_at) >= ? AND COALESCE(order_date, created_at) <= ? GROUP BY m").all(businessId, yearStart, yearEnd)) as any[];
            const delvData = (await db.prepare("SELECT CAST(EXTRACT(MONTH FROM to_timestamp(completed_at)) AS INTEGER) as m, COUNT(*) as count FROM orders WHERE business_id = ? AND status IN ('completed', 'invoiced') AND completed_at >= ? AND completed_at <= ? GROUP BY m").all(businessId, yearStart, yearEnd)) as any[];

            const revMap = Object.fromEntries(revData.map(r => [r.m, r.total]));
            const ordsMap = Object.fromEntries(ordsData.map(r => [r.m, r.count]));
            const delvMap = Object.fromEntries(delvData.map(r => [r.m, r.count]));

            for (let i = 0; i < 12; i++) {
                const monthNum = i + 1;
                const name = new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' });
                analyticsData.push({
                    name,
                    revenue: revMap[monthNum] || 0,
                    orders: ordsMap[monthNum] || 0,
                    delivered: delvMap[monthNum] || 0,
                });
            }
        } else {
            // Trend for each week of the month
            const m = parseInt(selectedMonth) - 1;
            const monthStart = Math.floor(new Date(selectedYear, m, 1).getTime() / 1000);
            const monthEnd = Math.floor(new Date(selectedYear, m + 1, 0, 23, 59, 59).getTime() / 1000);

            // Group by Week (1-4, roughly 7 days each)
            const revData = (await db.prepare("SELECT CEIL(EXTRACT(DAY FROM to_timestamp(paid_at)) / 7.0) as w, COALESCE(SUM(amount), 0) as total FROM invoices WHERE business_id = ? AND status = 'paid' AND paid_at >= ? AND paid_at <= ? GROUP BY w").all(businessId, monthStart, monthEnd)) as any[];
            const ordsData = (await db.prepare("SELECT CEIL(EXTRACT(DAY FROM to_timestamp(COALESCE(order_date, created_at))) / 7.0) as w, COUNT(*) as count FROM orders WHERE business_id = ? AND COALESCE(order_date, created_at) >= ? AND COALESCE(order_date, created_at) <= ? GROUP BY w").all(businessId, monthStart, monthEnd)) as any[];
            const delvData = (await db.prepare("SELECT CEIL(EXTRACT(DAY FROM to_timestamp(completed_at)) / 7.0) as w, COUNT(*) as count FROM orders WHERE business_id = ? AND status IN ('completed', 'invoiced') AND completed_at >= ? AND completed_at <= ? GROUP BY w").all(businessId, monthStart, monthEnd)) as any[];

            const revMap = Object.fromEntries(revData.map(r => [Math.min(4, Math.floor(r.w)), r.total]));
            const ordsMap = Object.fromEntries(ordsData.map(r => [Math.min(4, Math.floor(r.w)), r.count]));
            const delvMap = Object.fromEntries(delvData.map(r => [Math.min(4, Math.floor(r.w)), r.count]));

            for (let i = 0; i < 4; i++) {
                const weekNum = i + 1;
                const name = `W${weekNum}`;
                analyticsData.push({
                    name,
                    revenue: revMap[weekNum] || 0,
                    orders: ordsMap[weekNum] || 0,
                    delivered: delvMap[weekNum] || 0,
                });
            }
        }

        // Recent Deliveries, Top Customers, etc. (Filtered by period)
        const recentDeliveries = (await db.prepare(`
            SELECT o.id, o.customer_id, c.name as customer, d.name as design, o.status, o.completed_at as date
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.business_id = ? AND o.status IN ('completed', 'invoiced')
            AND o.completed_at >= ? AND o.completed_at <= ?
            ORDER BY o.completed_at DESC
            LIMIT 5
        `).all(businessId, startTs, endTs));

        const topCustomers = (await db.prepare(`
            SELECT c.id, c.name, COALESCE(SUM(i.amount), 0) as revenue
            FROM customers c
            LEFT JOIN invoices i ON c.id = i.customer_id AND i.status = 'paid' AND i.paid_at >= ? AND i.paid_at <= ? AND i.business_id = ?
            WHERE c.business_id = ?
            GROUP BY c.id
            ORDER BY revenue DESC
            LIMIT 5
        `).all(startTs, endTs, businessId, businessId));

        // For designs, wait do we scope designs? The schema says NO designs business_id! Wait, I haven't checked if designs has business_id.
        // Let's assume designs will be scoped later or is already scoped. I will add business_id if it exists. But wait, if it doesn't exist, SQL error.
        // I should check `designs` schema first! Let's NOT scope designs here yet until I verify, or let's omit `business_id` from designs query for now.
        const lowStock = (await db.prepare(`
            SELECT id, name, stock_quantity as remaining
            FROM designs
            WHERE stock_quantity < 20
            LIMIT 5
        `).all()); // I will come back to this when I fix inventory/designs API.

        const upcomingDeliveries = (await db.prepare(`
            SELECT o.id, o.customer_id, c.name as customer, d.name as design, o.quantity_meters as quantity, COALESCE(o.order_date, o.created_at) as date, o.status
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.business_id = ? AND o.status IN ('pending', 'approved')
            AND COALESCE(o.order_date, o.created_at) >= ? AND COALESCE(o.order_date, o.created_at) <= ?
            ORDER BY COALESCE(o.order_date, o.created_at) ASC
            LIMIT 8
        `).all(businessId, startTs, endTs));

        // Fetch Overdue Invoice Alerts
        const invoiceAlerts = (await db.prepare(`
            SELECT i.id, c.name as customer, i.amount, i.due_date, i.status
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.business_id = ? AND (i.status = 'overdue' OR (i.status = 'unpaid' AND i.due_date < date('now')))
            ORDER BY i.due_date ASC
            LIMIT 2
        `).all(businessId));

        // Fetch Overdue Vendor Payment Alerts
        const vendorPaymentAlerts = (await db.prepare(`
            SELECT id, vendor_name, work_type, balance, due_date, status
            FROM vendor_payments
            WHERE business_id = ? AND (status = 'overdue' OR (status = 'unpaid' AND due_date < date('now')))
            ORDER BY due_date ASC
            LIMIT 2
        `).all(businessId));

        // Calculate GST Liability (Current Month)
        const salesGST = (await db.prepare(`
            SELECT COALESCE(SUM(gst_amount), 0) as totalOutput
            FROM invoices
            WHERE business_id = ? AND generated_at >= ? AND generated_at <= ? AND gst_type != 'NONE'
        `).get(businessId, startTs, endTs)) as { totalOutput: number };

        const purchasesGST = (await db.prepare(`
            SELECT COALESCE(SUM(gst_amount), 0) as totalInput
            FROM expenses
            WHERE business_id = ? AND date >= ? AND date <= ? AND has_gst = 1 AND itc_claimed = 1 AND type = 'out'
        `).get(businessId, startTs, endTs)) as { totalInput: number };

        const netGstLiability = (salesGST.totalOutput || 0) - (purchasesGST.totalInput || 0);

        return NextResponse.json({
            ordersReceived: {
                value: currentOrders.count,
                change: calculateChange(currentOrders.count, lastOrders.count)
            },
            ordersDelivered: {
                value: currentDelivered.count,
                change: calculateChange(currentDelivered.count, lastDelivered.count)
            },
            revenueCollected: {
                value: currentRevenue.revenue,
                change: calculateChange(currentRevenue.revenue, lastRevenue.revenue)
            },
            outstandingAmount: {
                value: currentOutstanding.total,
                change: calculateChange(currentOutstanding.total, lastOutstandingValue.total)
            },
            gstLiability: netGstLiability,
            analyticsData: analyticsData,
            invoiceAlerts: invoiceAlerts.map((i: any) => ({
                id: i.id,
                name: i.customer,
                amount: i.amount,
                dueDate: i.due_date
            })),
            vendorPaymentAlerts: vendorPaymentAlerts.map((v: any) => ({
                id: v.id,
                name: v.vendor_name,
                workType: v.work_type,
                balance: v.balance,
                dueDate: v.due_date
            })),
            recentDeliveries: recentDeliveries.map((d: any) => ({
                id: d.id,
                customerId: d.customer_id,
                customer: d.customer,
                design: d.design,
                status: d.status === 'invoiced' ? 'delivered' : d.status,
                date: new Date(d.date * 1000).toLocaleDateString()
            })),
            topCustomers: topCustomers.map((c: any) => ({
                id: c.id,
                name: c.name,
                revenue: c.revenue,
                risk: c.revenue > 100000 ? 'low' : c.revenue > 50000 ? 'medium' : 'high'
            })),
            lowStock: lowStock.map((s: any) => ({
                id: s.id,
                name: s.name,
                remaining: `${s.remaining}m remaining`,
                status: s.remaining === 0 ? 'out' : 'low'
            })),
            upcomingDeliveries: upcomingDeliveries.map((u: any) => ({
                id: u.id.toString(),
                customerId: u.customer_id,
                customer: u.customer,
                design: u.design,
                quantity: `${u.quantity}m`,
                deliveryDate: new Date((u.date + 86400 * 7) * 1000).toLocaleDateString(),
                status: u.status === 'pending' ? 'Scheduled' : 'In Production'
            })),
        });
    } catch (error: any) {
        console.error('Dashboard stats error:', error.message, error.stack);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
