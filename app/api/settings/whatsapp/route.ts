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
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDatabase();
        const rows = (await db.prepare(`
            SELECT * FROM settings 
            WHERE key IN (
                'telegram_bot_token', 'telegram_chat_id', 'reminders_enabled',
                'notify_daily_reminder', 'notify_attendance', 'notify_new_order',
                'notify_payment_received', 'notify_vendor_payment', 'notify_weekly_summary',
                'notify_monthly_summary'
            )
        `).all()) as any[];

        const settingsMap: Record<string, string> = {};
        rows.forEach((r) => {
            settingsMap[r.key] = r.value;
        });

        // Get last log
        const lastLog = (await db.prepare(`
            SELECT * FROM reminder_logs 
            ORDER BY sent_at DESC LIMIT 1
        `).get()) as any;

        // Get last 30 days logs
        const logs = (await db.prepare(`
            SELECT * FROM reminder_logs 
            ORDER BY sent_at DESC LIMIT 30
        `).all()) as any[];

        const envToken = process.env.TELEGRAM_BOT_TOKEN || '';
        const envChatId = process.env.TELEGRAM_CHAT_ID || '';

        return NextResponse.json({
            telegram_bot_token: settingsMap['telegram_bot_token'] || envToken || '',
            telegram_chat_id: settingsMap['telegram_chat_id'] || envChatId || '',
            reminders_enabled: settingsMap['reminders_enabled'] || 'off',
            notify_daily_reminder: settingsMap['notify_daily_reminder'] || 'on',
            notify_attendance: settingsMap['notify_attendance'] || 'on',
            notify_new_order: settingsMap['notify_new_order'] || 'on',
            notify_payment_received: settingsMap['notify_payment_received'] || 'on',
            notify_vendor_payment: settingsMap['notify_vendor_payment'] || 'on',
            notify_weekly_summary: settingsMap['notify_weekly_summary'] || 'on',
            notify_monthly_summary: settingsMap['notify_monthly_summary'] || 'on',
            env_telegram_bot_token: envToken,
            env_telegram_chat_id: envChatId,
            lastReminderSent: lastLog ? new Date(lastLog.sent_at * 1000).toISOString() : null,
            logs: logs.map(l => ({
                id: l.id,
                sentAt: new Date(l.sent_at * 1000).toISOString(),
                dueTodayCount: l.due_today_count,
                overdueCount: l.overdue_count,
                totalDueToday: l.total_due_today,
                totalOverdue: l.total_overdue,
                callMeBotStatus: l.callmebot_status
            }))
        });
    } catch (error) {
        console.error('Fetch settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const db = getDatabase();

        const allowedKeys = [
            'telegram_bot_token', 
            'telegram_chat_id', 
            'reminders_enabled',
            'notify_daily_reminder',
            'notify_attendance',
            'notify_new_order',
            'notify_payment_received',
            'notify_vendor_payment',
            'notify_weekly_summary',
            'notify_monthly_summary'
        ];

        const saveTx = db.transaction(async () => {
            for (const key of allowedKeys) {
                if (body[key] !== undefined) {
                    (await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value").run(key, String(body[key])));
                }
            }
        });

        await saveTx();

        return NextResponse.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Save settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
