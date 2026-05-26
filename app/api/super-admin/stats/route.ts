import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = getDatabase();

        const businessesResult = (await db.prepare('SELECT COUNT(*) as count FROM businesses').get()) as { count: number };

        const plansResult = (await db.prepare(`
            SELECT value as plan, COUNT(*) as count 
            FROM settings 
            WHERE key LIKE '%subscription_plan%'
            GROUP BY value
        `).all()) as { plan: string, count: number }[];

        const activePlans = plansResult.reduce((acc, curr) => acc + curr.count, 0) || businessesResult.count;

        const usersResult = (await db.prepare('SELECT COUNT(*) as count FROM users').get()) as { count: number };
        const revenueResult = (await db.prepare("SELECT SUM(total_price) as total FROM orders WHERE status = 'delivered'").get()) as { total: number };

        return NextResponse.json({
            businesses: { value: businessesResult.count, change: 5.2 },
            activePlans: { value: activePlans, change: 2.1 },
            totalUsers: { value: usersResult.count, change: 8.4 },
            platformRevenue: { value: revenueResult.total || 0, change: 12.5 }
        });
    } catch (error) {
        console.error('Super admin stats fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
