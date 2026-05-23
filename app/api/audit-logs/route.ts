import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('settings.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const entity = searchParams.get('entity') || 'all';
        const action = searchParams.get('action') || 'all';
        const dateFrom = searchParams.get('dateFrom') || '';
        const dateTo = searchParams.get('dateTo') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 50;
        const offset = (page - 1) * limit;

        const db = getDatabase();

        let query = 'SELECT id, timestamp, user_name, user_role, action, entity, entity_id, entity_label, changes FROM audit_logs WHERE business_id = $1';
        const params: any[] = [businessId];
        let paramIdx = 2;

        if (entity !== 'all') {
            query += ` AND entity = $${paramIdx++}`;
            params.push(entity);
        }

        if (action !== 'all') {
            query += ` AND action = $${paramIdx++}`;
            params.push(action);
        }

        if (search) {
            query += ` AND (user_name ILIKE $${paramIdx} OR action ILIKE $${paramIdx + 1} OR entity_label ILIKE $${paramIdx + 2})`;
            const likeTerm = `%${search}%`;
            params.push(likeTerm, likeTerm, likeTerm);
            paramIdx += 3;
        }

        if (dateFrom) {
            const fromTs = Math.floor(new Date(dateFrom).getTime() / 1000);
            query += ` AND timestamp >= $${paramIdx++}`;
            params.push(fromTs);
        }

        if (dateTo) {
            const toTs = Math.floor(new Date(dateTo).getTime() / 1000) + 86399;
            query += ` AND timestamp <= $${paramIdx++}`;
            params.push(toTs);
        }

        // Count total for pagination
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS sub`;
        const totalResult = (await db.prepare(countQuery).get(...params)) as { total: number | string };
        const total = parseInt(String(totalResult?.total || '0'));

        // Paginated results ordered by newest first
        query += ` ORDER BY timestamp DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(limit, offset);

        const logs = (await db.prepare(query).all(...params)) as any[];

        return NextResponse.json({
            success: true,
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error: any) {
        console.error('Audit logs API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
