import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

const DEFAULT_GST_SETTINGS = {
    gstin: '',
    legal_name: '',
    address: '',
    state: 'Gujarat',
    state_code: '24',
    default_rate: 5,
    hsn_code: '5407',
    filing_frequency: 'Monthly'
};

export async function GET() {
    try {
        const { authorized, error, status } = await checkPermission('settings.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const db = getDatabase();
        const row = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as any;

        let settings = DEFAULT_GST_SETTINGS;
        if (row?.value) {
            try {
                settings = { ...DEFAULT_GST_SETTINGS, ...JSON.parse(row.value) };
            } catch (parseErr) {
                console.error('Error parsing GST settings JSON:', parseErr);
            }
        }

        return NextResponse.json({ settings });
    } catch (err: any) {
        console.error('GST Settings GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const body = await request.json();
        const { gstin, legal_name, address, state, state_code, default_rate, hsn_code, filing_frequency } = body;

        // Perform basic validations if GSTIN is provided
        const cleanGstin = (gstin || '').trim().toUpperCase();
        if (cleanGstin) {
            if (cleanGstin.length !== 15) {
                return NextResponse.json({ error: 'GSTIN must be exactly 15 characters' }, { status: 400 });
            }
            if (!cleanGstin.startsWith('24')) {
                return NextResponse.json({ error: 'GSTIN must start with state code 24 for Gujarat' }, { status: 400 });
            }
        }

        const settingsToSave = {
            gstin: cleanGstin,
            legal_name: (legal_name || '').trim(),
            address: (address || '').trim(),
            state: state || 'Gujarat',
            state_code: state_code || '24',
            default_rate: parseFloat(default_rate) || 5,
            hsn_code: (hsn_code || '5407').trim(),
            filing_frequency: filing_frequency || 'Monthly'
        };

        const db = getDatabase();
        (await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
                    .run('gst', JSON.stringify(settingsToSave)));

        return NextResponse.json({ success: true, settings: settingsToSave });
    } catch (err: any) {
        console.error('GST Settings POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
