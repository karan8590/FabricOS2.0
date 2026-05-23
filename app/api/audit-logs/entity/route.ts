import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const entity = searchParams.get('entity');
        const entityId = searchParams.get('entityId');

        if (!entity || !entityId) {
            return NextResponse.json({ error: 'Missing entity or entityId' }, { status: 400 });
        }

        const db = getDatabase();

        // Fetch logs for specific entity within the business context
        const logs = (await db.prepare(`
            SELECT id, timestamp, user_name, action, entity_label, changes
            FROM audit_logs
            WHERE business_id = $1 AND entity = $2 AND entity_id = $3
            ORDER BY timestamp DESC
            LIMIT 100
        `).all(user.businessId, entity, entityId)) as any[];

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Fetch entity audit logs error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
