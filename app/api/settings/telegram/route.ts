import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET() {
    try {
        const { authorized, error, status } = await checkPermission('settings.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        const rows = (await db.prepare(`
            SELECT * FROM settings 
            WHERE key LIKE 'role_lang_default_%'
        `).all()) as any[];

        const roleDefaults: Record<string, string> = {
            'Admin': 'english',
            'Manager': 'english',
            'Staff': 'gujarati',
            'Accountant': 'english',
            'Production Staff': 'gujarati'
        };

        rows.forEach((row) => {
            const roleName = row.key.replace('role_lang_default_', '');
            roleDefaults[roleName] = row.value;
        });

        return NextResponse.json({ roleDefaults });
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
        const { roleDefaults, token } = body;

        const db = getDatabase();

        if (token) {
            // Validate the token with Telegram API
            const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
            const tgData = await tgRes.json();
            
            if (tgData.ok) {
                await db.prepare("INSERT INTO settings (key, value) VALUES ('telegram_bot_token', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
                  .run(token);
                return NextResponse.json({ success: true, bot: tgData.result });
            } else {
                return NextResponse.json({ error: 'Invalid Bot Token from Telegram' }, { status: 400 });
            }
        }

        if (roleDefaults && typeof roleDefaults === 'object') {
            const saveTx = db.transaction(async () => {
                for (const [role, lang] of Object.entries(roleDefaults)) {
                    (await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
                                      .run(`role_lang_default_${role}`, String(lang)));
                }
            });
            saveTx();
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
