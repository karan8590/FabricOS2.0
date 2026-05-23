import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { logAction } from '@/lib/auditLogger';

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
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const businessId = user.businessId;

        const db = getDatabase();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const filter = searchParams.get('filter') || 'All'; // All | Overdue | Due this week | Unpaid | Partial | Paid

        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Status Auto-Update: Batch check all unpaid/partial payments
        (await db.prepare(`
            UPDATE vendor_payments 
            SET status = 'overdue' 
            WHERE due_date < ? AND status = 'unpaid'
        `).run(todayStr));

        // 2. Fetch KPI Stats
        // Card 1 — Total outstanding
        const outstandingRow = (await db.prepare(`
            SELECT COALESCE(SUM(balance), 0) AS val 
            FROM vendor_payments 
            WHERE status != 'paid' AND business_id = ?
        `).get(businessId)) as any;
        const totalOutstanding = outstandingRow?.val || 0;

        // Card 2 — Overdue
        const overdueRow = (await db.prepare(`
            SELECT COALESCE(SUM(balance), 0) AS val 
            FROM vendor_payments 
            WHERE status = 'overdue' AND business_id = ?
        `).get(businessId)) as any;
        const totalOverdue = overdueRow?.val || 0;

        // Card 3 — Due this week (Next 7 days)
        const sevenDaysLater = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
        const dueThisWeekRow = (await db.prepare(`
            SELECT COALESCE(SUM(balance), 0) AS val 
            FROM vendor_payments 
            WHERE due_date >= ? AND due_date <= ? AND status != 'paid' AND business_id = ?
        `).get(todayStr, sevenDaysLater, businessId)) as any;
        const totalDueThisWeek = dueThisWeekRow?.val || 0;

        // Card 4 — Paid this month (Instalments sum in current month)
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        const paidThisMonthRow = (await db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS val 
            FROM vendor_payment_instalments vpi
            JOIN vendor_payments vp ON vpi.vendor_payment_id = vp.id
            WHERE vpi.date >= ? AND vpi.date <= ? AND vp.business_id = ?
        `).get(startOfMonth, endOfMonth, businessId)) as any;
        const totalPaidThisMonth = paidThisMonthRow?.val || 0;

        // 3. Retrieve and Filter Payments
        let query = `
            SELECT * FROM vendor_payments 
            WHERE 1=1 AND business_id = ?
        `;
        const params: any[] = [businessId];

        if (search) {
            query += ` AND (vendor_name LIKE ? OR order_number LIKE ? OR work_type LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (filter === 'Overdue') {
            query += ` AND status = 'overdue'`;
        } else if (filter === 'Due this week') {
            query += ` AND due_date >= ? AND due_date <= ? AND status != 'paid'`;
            params.push(todayStr, sevenDaysLater);
        } else if (filter === 'Unpaid') {
            query += ` AND status = 'unpaid'`;
        } else if (filter === 'Partial') {
            query += ` AND status = 'partial'`;
        } else if (filter === 'Paid') {
            query += ` AND status = 'paid'`;
        }

        // Sort order: Overdue first → Due soonest → Partial → Paid
        query += `
            ORDER BY 
                CASE 
                    WHEN status = 'overdue' THEN 1 
                    WHEN status = 'unpaid' THEN 2 
                    WHEN status = 'partial' THEN 3 
                    ELSE 4 
                END ASC,
                due_date ASC
        `;

        const payments = (await db.prepare(query).all(...params)) as any[];

        // Enrich with instalments history
        const enrichedPayments = payments.map(async (payment) => {
            const instalments = (await db.prepare(`
                SELECT * FROM vendor_payment_instalments 
                WHERE vendor_payment_id = ? 
                ORDER BY date DESC
            `).all(payment.id));
            return {
                ...payment,
                instalments
            };
        });

        return NextResponse.json({
            payments: enrichedPayments,
            stats: {
                totalOutstanding,
                totalOverdue,
                totalDueThisWeek,
                totalPaidThisMonth
            }
        });
    } catch (error) {
        console.error('Fetch vendor payments error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = user.businessId;

        const body = await request.json();
        const {
            vendor_id,
            work_type,
            total_amount,
            due_date,
            notes
        } = body;

        if (!vendor_id || !work_type || total_amount === undefined || !due_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();

        // Look up vendor details
        const vendor = (await db.prepare('SELECT name, contact FROM vendors WHERE id = ? AND business_id = ?').get(vendor_id, businessId)) as any;
        if (!vendor) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const status = due_date < todayStr ? 'overdue' : 'unpaid';

        const result = (await db.prepare(`
            INSERT INTO vendor_payments (
                business_id, vendor_id, vendor_name, vendor_phone, order_id, order_number,
                work_type, total_amount, amount_paid, balance, due_date, status, notes
            ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 0, ?, ?, ?, ?)
        `).run(
                    businessId,
                    vendor_id,
                    vendor.name,
                    vendor.contact || '',
                    work_type,
                    total_amount,
                    total_amount,
                    due_date,
                    status,
                    notes || ''
                ));

        // Audit log: vendor payment creation
        await logAction({
            action: 'create',
            entity: 'vendor_payment',
            entityId: result.lastInsertRowid?.toString(),
            entityLabel: `${vendor.name} — ${work_type}`,
            changes: { vendor_id, work_type, total_amount, due_date },
            businessId
        });

        return NextResponse.json({ success: true, paymentId: result.lastInsertRowid });
    } catch (error) {
        console.error('Create manual payment due error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
