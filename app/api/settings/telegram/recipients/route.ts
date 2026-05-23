import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET() {
    try {
        const { authorized, error, status } = await checkPermission('settings.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        
        // Fetch all recipients and their preferences
        const recipients = (await db.prepare(`
            SELECT 
                r.*,
                p.daily_payments,
                p.attendance_reminder,
                p.weekly_summary,
                p.monthly_summary,
                p.instant_order_alerts,
                p.vendor_alerts,
                p.salary_alerts,
                p.expense_alerts
            FROM telegram_recipients r
            LEFT JOIN telegram_notification_preferences p ON r.id = p.recipient_id
            ORDER BY r.created_at DESC
        `).all());

        return NextResponse.json({ recipients });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const body = await request.json();
        const { 
            recipient_name, 
            telegram_chat_id, 
            telegram_username, 
            role, 
            notifications_enabled = 1,
            preferred_language = 'role_default'
        } = body;

        if (!recipient_name || !telegram_chat_id) {
            return NextResponse.json({ error: 'Name and Chat ID are required' }, { status: 400 });
        }

        const db = getDatabase();
        
        let recipientId;
        db.transaction(async () => {
            const result = (await db.prepare(`
                INSERT INTO telegram_recipients (
                    recipient_name, telegram_chat_id, telegram_username, role, notifications_enabled, preferred_language
                ) VALUES (?, ?, ?, ?, ?, ?)
            `).run(recipient_name, telegram_chat_id, telegram_username || null, role || 'Staff', notifications_enabled, preferred_language));
            
            recipientId = result.lastInsertRowid;

            (await db.prepare(`
                INSERT INTO telegram_notification_preferences (
                    recipient_id, daily_payments, attendance_reminder, weekly_summary, 
                    monthly_summary, instant_order_alerts, vendor_alerts, salary_alerts, expense_alerts
                ) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)
            `).run(recipientId));
        })();

        return NextResponse.json({ success: true, id: recipientId });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
