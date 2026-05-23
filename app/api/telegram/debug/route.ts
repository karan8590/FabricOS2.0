import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function GET() {
    const report: Record<string, any> = {};

    try {
        const db = getDatabase();

        // ── 1. BOT TOKEN ──────────────────────────────────────────────────────────
        const tokenRow = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()) as any;
        const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;
        report.botToken = token ? `SET (${String(token).substring(0, 8)}...)` : '❌ MISSING';

        // ── 2. RECIPIENTS ─────────────────────────────────────────────────────────
        const recipients = (await db.prepare(`
            SELECT id, recipient_name, telegram_chat_id, role, notifications_enabled, is_active, preferred_language
            FROM telegram_recipients
        `).all()) as any[];
        report.totalRecipients = recipients.length;
        report.recipients = recipients.map(r => ({
            id: r.id,
            name: r.recipient_name,
            chatId: r.telegram_chat_id ? `${String(r.telegram_chat_id).substring(0, 6)}...` : '❌ EMPTY',
            role: r.role,
            active: r.is_active,
            notificationsEnabled: r.notifications_enabled,
            language: r.preferred_language
        }));

        // ── 3. PREFERENCES ────────────────────────────────────────────────────────
        const prefs = (await db.prepare(`SELECT * FROM telegram_notification_preferences`).all()) as any[];
        report.totalPrefsRows = prefs.length;
        report.prefsRows = prefs;

        // ── 4. RECIPIENTS WITHOUT PREFS (the bug) ────────────────────────────────
        const orphans = (await db.prepare(`
            SELECT r.id, r.recipient_name
            FROM telegram_recipients r
            LEFT JOIN telegram_notification_preferences p ON r.id = p.recipient_id
            WHERE p.recipient_id IS NULL
        `).all()) as any[];
        report.recipientsWithoutPrefs = orphans;
        if (orphans.length > 0) {
            report.orphanWarning = `⚠️ ${orphans.length} recipients have NO preferences row — auto-fixing now`;
            // Auto-fix them
            const fixStmt = db.prepare(`
                INSERT OR IGNORE INTO telegram_notification_preferences (
                    recipient_id, daily_payments, attendance_reminder, weekly_summary,
                    monthly_summary, instant_order_alerts, vendor_alerts, salary_alerts, expense_alerts
                ) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)
            `);
            for (const orphan of orphans) {
                fixStmt.run(orphan.id);
            }
            report.orphanFixed = `✅ Inserted default prefs rows for ${orphans.length} recipients`;
        }

        // ── 5. EFFECTIVE RECIPIENTS FOR instant_order_alerts ─────────────────────
        const activeForOrders = (await db.prepare(`
            SELECT r.id, r.recipient_name, r.telegram_chat_id, r.role, r.preferred_language
            FROM telegram_recipients r
            LEFT JOIN telegram_notification_preferences p ON r.id = p.recipient_id
            WHERE r.is_active = 1
            AND r.notifications_enabled = 1
            AND COALESCE(p.instant_order_alerts, 1) = 1
        `).all()) as any[];
        report.activeForInstantOrderAlerts = activeForOrders.length;

        // ── 6. LIVE TELEGRAM API TEST (send to first active recipient) ─────────────
        if (token && activeForOrders.length > 0) {
            const testTarget = activeForOrders[0];
            const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
            try {
                // 1. Test Raw API fetch
                const res = await fetch(telegramUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: testTarget.telegram_chat_id,
                        text: `🔧 *FabricOS Debug Probe (Raw Fetch)*\n\nDirect API connectivity confirmed.\nRecipient: ${testTarget.recipient_name}\nTimestamp: ${new Date().toISOString()}`,
                        parse_mode: 'Markdown'
                    })
                });
                const json = await res.json();
                report.liveApiTest = {
                    target: testTarget.recipient_name,
                    chatId: String(testTarget.telegram_chat_id).substring(0, 8) + '...',
                    httpStatus: res.status,
                    telegramOk: json.ok,
                    error: json.ok ? null : json.description
                };

                // 2. Test Central sendTelegramMessage utility
                try {
                    const { sendTelegramMessage } = require('@/lib/telegram');
                    report.sendTelegramMessageImported = typeof sendTelegramMessage === 'function' ? '✅ FUNCTION' : `❌ ${typeof sendTelegramMessage}`;
                    
                    const utResult = await sendTelegramMessage({
                        english: `🔧 *FabricOS Central Dispatch Test (EN)*\n\nUtility dispatch confirmed.\nTimestamp: ${new Date().toISOString()}`,
                        gujarati: `🔧 *FabricOS Central Dispatch Test (GUJ)*\n\nચલાવવામાં આવેલ ઉપયોગિતા સંદેશ.\nTimestamp: ${new Date().toISOString()}`
                    }, 'instant_order_alerts');
                    
                    report.sendTelegramMessageResult = utResult ? '✅ SUCCESS' : '❌ FAILED (returned false)';
                } catch (utErr: any) {
                    report.sendTelegramMessageResult = `❌ ERROR: ${utErr.message}`;
                    report.sendTelegramMessageStack = utErr.stack;
                }

            } catch (apiErr: any) {
                report.liveApiTest = { error: apiErr.message };
            }
        } else {
            report.liveApiTest = '⚠️ Skipped — no token or no active recipients';
        }

        // ── 7. ROLE LANG DEFAULTS ─────────────────────────────────────────────────
        const langDefaults = (await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'role_lang_default_%'").all());
        report.roleLanguageDefaults = langDefaults;

        // ── 8. RECENT NOTIFICATION LOGS ───────────────────────────────────────────
        const recentLogs = (await db.prepare(`
            SELECT l.*, r.recipient_name
            FROM telegram_notification_logs l
            LEFT JOIN telegram_recipients r ON l.recipient_id = r.id
            ORDER BY l.sent_at DESC
            LIMIT 10
        `).all());
        report.recentLogs = recentLogs;

        return NextResponse.json({ status: 'ok', report }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ status: 'error', error: err.message, report }, { status: 500 });
    }
}
