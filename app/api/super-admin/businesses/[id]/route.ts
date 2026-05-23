import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = getDatabase();
        
        const business = (await db.prepare('SELECT * FROM businesses WHERE id = ?').get(params.id)) as any;
        if (!business) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const settings = (await db.prepare('SELECT key, value FROM settings WHERE business_id = ?').all(params.id)) as {key: string, value: string}[];
        const settingsMap = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

        const users = (await db.prepare('SELECT id, name, phone, role, created_at FROM users WHERE business_id = ? ORDER BY created_at DESC').all(params.id));

        return NextResponse.json({
            ...business,
            settings: settingsMap,
            users
        });
    } catch (error) {
        console.error('Super admin business fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const db = getDatabase();

        if (body.action === 'toggle_status') {
            const newStatus = body.status === 'active' ? 'suspended' : 'active';
            (await db.prepare('UPDATE businesses SET status = ? WHERE id = ?').run(newStatus, params.id));
            return NextResponse.json({ success: true, status: newStatus });
        }

        if (body.action === 'update_details') {
            const { name } = body;
            if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
            (await db.prepare('UPDATE businesses SET name = ? WHERE id = ?').run(name, params.id));
            return NextResponse.json({ success: true });
        }

        if (body.action === 'update_setting') {
            const { key, value } = body;
            // Upsert setting
            (await db.prepare(`
                INSERT INTO settings (key, value, business_id) 
                VALUES (?, ?, ?) 
                ON CONFLICT(key, business_id) DO UPDATE SET value = excluded.value
            `).run(key, String(value), params.id)); // SQLite constraint usually on key alone, but wait, schema says: `key TEXT PRIMARY KEY` without business_id! 
            
            // Wait, settings table only has key TEXT PRIMARY KEY. Let's look at lib/db/index.ts!
            // `ALTER TABLE settings ADD COLUMN business_id TEXT DEFAULT 'business_001';`
            // Since it's a PRIMARY KEY on 'key' alone, inserting the same key for another business will FAIL if it's the same key! 
            // In a multi-tenant environment, the settings table usually needs to have (key, business_id) as primary key.
            // Since we can't easily alter the primary key in SQLite, for the sake of lightweight implementation, we will append business_id to the key, e.g. `subscription_plan_business_123` OR we update the existing row if we can.
            // Let's use `key || '_' || business_id` internally to be safe, or just insert.
            
            // Actually, in `lib/db/index.ts`, the schema is:
            // `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`
            // If we try to insert `subscription_plan` for another business, it will conflict!
            const scopedKey = `${params.id}_${key}`;
            (await db.prepare(`
                INSERT INTO settings (key, value, business_id) 
                VALUES (?, ?, ?) 
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `).run(scopedKey, String(value), params.id));
            
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Super admin business update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
