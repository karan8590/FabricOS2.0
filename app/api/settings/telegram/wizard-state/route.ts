import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function GET() {
    try {
        const db = getDatabase();
        const row = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_wizard_state' AND business_id = 'business_001'").get()) as any;
        
        const defaultState = {
            step: 1,
            botTokenValid: false,
            webhookRegistered: false,
            recipientsAdded: false,
            commandsEnabled: false,
            testSent: false,
            isActivated: false
        };

        if (row && row.value) {
            try {
                return NextResponse.json({ success: true, state: JSON.parse(row.value) });
            } catch (e) {
                return NextResponse.json({ success: true, state: defaultState });
            }
        }

        return NextResponse.json({ success: true, state: defaultState });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { state } = body;
        const db = getDatabase();

        await db.prepare(`
            INSERT INTO settings (key, value, business_id) 
            VALUES ('telegram_wizard_state', ?, 'business_001')
            ON CONFLICT (key) DO UPDATE SET value = excluded.value
        `).run(JSON.stringify(state));

        return NextResponse.json({ success: true, state });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
