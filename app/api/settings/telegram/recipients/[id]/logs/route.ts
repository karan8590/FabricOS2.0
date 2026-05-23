import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('settings.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        
        // Fetch last 50 logs for this recipient
        const logs = (await db.prepare(`
            SELECT * FROM telegram_notification_logs
            WHERE recipient_id = ?
            ORDER BY sent_at DESC
            LIMIT 50
        `).all(params.id));

        return NextResponse.json({ logs });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
