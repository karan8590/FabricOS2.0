import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

async function getAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload || payload.role === 'customer') return null;
    return payload;
}

export async function POST(request: Request, context: any) {
    const params = await Promise.resolve(context.params);
    const designId = params.id;
    
    if (!designId) {
        return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
    }

    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { title, imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
        }

        const db = getDatabase();

        // Ensure design belongs to business
        const checkDesign = await db.query(
            'SELECT id FROM catalog_designs WHERE id = $1 AND business_id = $2',
            [designId, payload.businessId]
        );

        if (checkDesign.rows.length === 0) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        const insertResult = await db.query(
            `INSERT INTO design_master_sheets (business_id, design_id, title, image_url)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, image_url, created_at`,
            [payload.businessId, designId, title || 'Master Sheet', imageUrl]
        );

        return NextResponse.json({ success: true, masterSheet: insertResult.rows[0] });

    } catch (error) {
        console.error('[Master Sheets POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
