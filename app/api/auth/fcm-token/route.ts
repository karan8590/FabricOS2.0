import { NextResponse } from 'next/server';
import { checkPermission } from '@/lib/auth/permissions';
import getDatabase from '@/lib/db';

export async function POST(request: Request) {
    try {
        // Enforce basic authenticated access (can view catalog means logged in)
        const { authorized, user, error, status } = await checkPermission('catalog.view');
        
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const { fcmToken, notificationsEnabled } = await request.json();

        const db = getDatabase();
        
        // Update user FCM token and settings in the SQLite database
        (await db.prepare(`
            UPDATE users 
            SET fcm_token = ?, push_notifications_enabled = ? 
            WHERE id = ?
        `).run(fcmToken || null, notificationsEnabled ? 1 : 0, user!.userId));

        console.log(`[FCM API] Stored FCM token for User ${user!.userId} (Enabled: ${notificationsEnabled})`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('FCM Token Save Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
