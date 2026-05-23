import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function POST(req: Request) {
    try {
        const db = getDatabase();
        
        // 1. Get Bot Token
        const tokenRow = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
        const botToken = tokenRow?.value;

        // 2. Get Chat ID from Wizard State
        const stateRow = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_wizard_state'").get() as any;
        let chatId = null;
        if (stateRow?.value) {
            try {
                const state = JSON.parse(stateRow.value);
                chatId = state.chatId;
            } catch (e) {}
        }

        // Check payload override
        const body = await req.json().catch(() => ({}));
        if (body.chatId) chatId = body.chatId;

        if (!botToken || !chatId) {
            return NextResponse.json({ success: false, error: 'Missing bot token or chat ID' }, { status: 400 });
        }

        // 3. Send Message
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: 'FabricOS connected successfully! <i class="ti ti-circle-check"></i>\n\nYour Telegram bot is now active.',
                parse_mode: 'HTML'
            })
        });

        const result = await response.json();

        // 4. Log to DB
        await db.prepare("INSERT INTO settings (key, value) VALUES ('telegram_test_log', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
                .run(JSON.stringify({ lastTestAt: new Date().toISOString(), response: result, chatId }));

        if (!result.ok) {
            return NextResponse.json({ success: false, error: result.description });
        }

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
