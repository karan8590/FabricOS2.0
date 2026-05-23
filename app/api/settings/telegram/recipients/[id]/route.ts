import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const body = await request.json();
        const db = getDatabase();
        
        db.transaction(async () => {
            // Update main recipient fields if provided
            if ('recipient_name' in body || 'telegram_chat_id' in body || 'telegram_username' in body || 'role' in body || 'notifications_enabled' in body || 'is_active' in body || 'preferred_language' in body) {
                (await db.prepare(`
                    UPDATE telegram_recipients 
                    SET 
                        recipient_name = COALESCE(?, recipient_name),
                        telegram_chat_id = COALESCE(?, telegram_chat_id),
                        telegram_username = COALESCE(?, telegram_username),
                        role = COALESCE(?, role),
                        notifications_enabled = COALESCE(?, notifications_enabled),
                        is_active = COALESCE(?, is_active),
                        preferred_language = COALESCE(?, preferred_language)
                    WHERE id = ?
                `).run(
                                    body.recipient_name ?? null,
                                    body.telegram_chat_id ?? null,
                                    body.telegram_username ?? null,
                                    body.role ?? null,
                                    body.notifications_enabled ?? null,
                                    body.is_active ?? null,
                                    body.preferred_language ?? null,
                                    params.id
                                ));
            }

            // Update preferences if provided
            if ('preferences' in body && body.preferences) {
                const prefs = body.preferences;
                (await db.prepare(`
                    UPDATE telegram_notification_preferences
                    SET
                        daily_payments = COALESCE(?, daily_payments),
                        attendance_reminder = COALESCE(?, attendance_reminder),
                        weekly_summary = COALESCE(?, weekly_summary),
                        monthly_summary = COALESCE(?, monthly_summary),
                        instant_order_alerts = COALESCE(?, instant_order_alerts),
                        vendor_alerts = COALESCE(?, vendor_alerts),
                        salary_alerts = COALESCE(?, salary_alerts),
                        expense_alerts = COALESCE(?, expense_alerts)
                    WHERE recipient_id = ?
                `).run(
                                    prefs.daily_payments ?? null,
                                    prefs.attendance_reminder ?? null,
                                    prefs.weekly_summary ?? null,
                                    prefs.monthly_summary ?? null,
                                    prefs.instant_order_alerts ?? null,
                                    prefs.vendor_alerts ?? null,
                                    prefs.salary_alerts ?? null,
                                    prefs.expense_alerts ?? null,
                                    params.id
                                ));
            }
        })();

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        const recipientId = parseInt(params.id, 10);
        if (isNaN(recipientId)) {
            return NextResponse.json({ error: 'Invalid Recipient ID' }, { status: 400 });
        }
        (await db.prepare('DELETE FROM telegram_recipients WHERE id = ?').run(recipientId));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
