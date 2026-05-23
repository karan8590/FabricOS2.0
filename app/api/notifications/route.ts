import { NextResponse } from 'next/server';
import { checkPermission } from '@/lib/auth/permissions';
import getDatabase from '@/lib/db';
import { NotificationService } from '@/lib/notifications/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Any authenticated user can view their OWN notifications
        const { authorized, user, error, status } = await checkPermission('catalog.view');

        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        // Automatically check and create overdue invoice alerts & pending salaries alerts lazily on-the-fly
        if (user!.role === 'admin' || user!.role === 'manager') {
            await NotificationService.checkAndCreateOverdueNotifications();
            await NotificationService.checkAndCreateSalaryNotifications();
        }

        const db = getDatabase();
        
        // Fetch personal notifications, sorted by creation date, limited to 50
        const notifications = (await db.prepare(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `).all(user!.userId));

        const unreadCount = (await db.prepare(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND is_read = 0
        `).get(user!.userId)) as { count: number };

        return NextResponse.json({
            notifications: notifications.map((n: any) => ({
                ...n,
                meta: JSON.parse(n.meta || '{}')
            })),
            unreadCount: unreadCount.count
        });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH() {
    // Mark ALL as read
    try {
        const { authorized, user, error, status } = await checkPermission('catalog.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        (await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user!.userId));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
