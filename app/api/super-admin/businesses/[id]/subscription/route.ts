import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { plan } = body;

        if (!plan) return NextResponse.json({ error: 'Plan is required' }, { status: 400 });

        const db = getDatabase();
        const scopedKey = `${params.id}_subscription_plan`;
        
        (await db.prepare(`
            INSERT INTO settings (key, value, business_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(scopedKey, plan, params.id));

        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Super admin subscription update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
