import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
        }

        const db = getDatabase();
        const tokenRow = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()) as any;
        const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;

        if (!token) {
            return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 400 });
        }

        const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(telegramUrl);
        const data = await res.json();

        return NextResponse.json({ success: data.ok, description: data.description });
    } catch (error: any) {
        console.error('Webhook registration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
