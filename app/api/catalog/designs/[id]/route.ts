import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

async function getAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

// ─── GET /api/catalog/designs/[id] ───────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const db = getDatabase();

        const designsResult = await db.query(
            `SELECT * FROM catalog_designs WHERE id = $1 AND business_id = $2`,
            [id, payload.businessId]
        );
        if (!designsResult.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const variantsResult = await db.query(
            `SELECT * FROM catalog_variants WHERE design_id = $1 ORDER BY created_at ASC`,
            [id]
        );

        return NextResponse.json({ design: { ...designsResult.rows[0], variants: variantsResult.rows } });
    } catch (error) {
        console.error('[Catalog Design GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PATCH /api/catalog/designs/[id] ─────────────────────────────────────────
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();

        const fields: string[] = [];
        const vals: any[] = [];
        let idx = 1;

        const allowed = ['design_code', 'design_name', 'category', 'fabric_type', 'base_rate',
                         'image_url', 'description', 'tags', 'is_active'];
        for (const key of allowed) {
            if (body[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                vals.push(body[key]);
            }
        }
        if (!fields.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

        vals.push(id, payload.businessId);
        await getDatabase().query(
            `UPDATE catalog_designs SET ${fields.join(', ')} WHERE id = $${idx++} AND business_id = $${idx}`,
            vals
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Catalog Design PATCH]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE /api/catalog/designs/[id] ────────────────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        await getDatabase().query(
            `DELETE FROM catalog_designs WHERE id = $1 AND business_id = $2`,
            [id, payload.businessId]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Catalog Design DELETE]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
