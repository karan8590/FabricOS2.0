import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET() {
    try {
        const { authorized, error, status, user } = await checkPermission('settings.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        const logs = await db.prepare(`
            SELECT l.*, r.recipient_name, r.telegram_username 
            FROM telegram_test_logs l
            LEFT JOIN telegram_recipients r ON l.recipient_id = r.id
            WHERE l.business_id = ?
            ORDER BY l.sent_at DESC
            LIMIT 50
        `).all(user?.businessId || 1);

        return NextResponse.json({ logs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
