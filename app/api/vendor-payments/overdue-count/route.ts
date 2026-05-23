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

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role === 'customer') {
            return NextResponse.json({ overdueCount: 0 });
        }

        const db = getDatabase();
        const todayStr = new Date().toISOString().split('T')[0];

        // Status Auto-Update first so count is always exact
        (await db.prepare(`
            UPDATE vendor_payments 
            SET status = 'overdue' 
            WHERE due_date < ? AND status = 'unpaid'
        `).run(todayStr));

        const countRow = (await db.prepare(`
            SELECT COUNT(*) AS count 
            FROM vendor_payments 
            WHERE status = 'overdue'
        `).get()) as any;

        return NextResponse.json({ overdueCount: countRow?.count || 0 });
    } catch (error) {
        console.error('Overdue count API error:', error);
        return NextResponse.json({ overdueCount: 0 });
    }
}
