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

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const paymentId = parseInt(params.id);
        const body = await request.json();
        const { due_date } = body;

        if (!due_date) {
            return NextResponse.json({ error: 'Missing due_date field' }, { status: 400 });
        }

        const db = getDatabase();

        // 1. Fetch vendor payment record
        const payment = (await db.prepare('SELECT * FROM vendor_payments WHERE id = ?').get(paymentId)) as any;
        if (!payment) {
            return NextResponse.json({ error: 'Vendor payment not found' }, { status: 404 });
        }

        // 2. Re-evaluate status based on new due date
        const todayStr = new Date().toISOString().split('T')[0];
        let newStatus = 'unpaid';

        if (payment.balance <= 0) {
            newStatus = 'paid';
        } else if (payment.amount_paid > 0) {
            newStatus = 'partial';
        } else if (due_date < todayStr) {
            newStatus = 'overdue';
        }

        // 3. Update in database
        (await db.prepare(`
            UPDATE vendor_payments 
            SET due_date = ?, status = ?
            WHERE id = ?
        `).run(due_date, newStatus, paymentId));

        return NextResponse.json({
            success: true,
            message: 'Due date updated successfully',
            status: newStatus
        });
    } catch (error) {
        console.error('Update vendor payment due date error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
