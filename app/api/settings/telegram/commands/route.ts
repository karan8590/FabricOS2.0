import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function GET() {
    try {
        const db = getDatabase();
        const row = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_enabled_commands' AND business_id = 'business_001'").get()) as any;
        
        let commands = [];
        if (row && row.value) {
            try {
                commands = JSON.parse(row.value);
            } catch (e) {}
        }

        return NextResponse.json({ success: true, commands });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { commands } = body;
        const db = getDatabase();

        // Save locally
        await db.prepare(`
            INSERT INTO settings (key, value, business_id) 
            VALUES ('telegram_enabled_commands', ?, 'business_001')
            ON CONFLICT (key) DO UPDATE SET value = excluded.value
        `).run(JSON.stringify(commands));

        // Push to Telegram API
        const tokenRow = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token' AND business_id = 'business_001'").get()) as any;
        if (tokenRow && tokenRow.value) {
            const token = tokenRow.value;
            
            // Format commands for Telegram API
            const tgCommands = commands.map((cmd: string) => {
                let desc = 'FabricOS command';
                switch(cmd) {
                    case 'summary': desc = 'Get daily financial summary'; break;
                    case 'order': desc = 'Check order status by ID'; break;
                    case 'payment': desc = 'Log a new payment'; break;
                    case 'dispatch': desc = 'Check recent dispatches'; break;
                    case 'pending': desc = 'View pending orders'; break;
                    case 'help': desc = 'List available commands'; break;
                }
                return { command: cmd, description: desc };
            });

            if (tgCommands.length > 0) {
                const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commands: tgCommands })
                });

                const data = await response.json();
                if (!data.ok) {
                    console.error('Failed to set telegram commands:', data);
                    return NextResponse.json({ success: false, error: 'Failed to register commands with Telegram', details: data });
                }
            } else {
                // Clear commands
                await fetch(`https://api.telegram.org/bot${token}/deleteMyCommands`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
