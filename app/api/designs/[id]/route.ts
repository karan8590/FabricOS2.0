import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = payload.businessId;

        const params = await context.params;
        const designId = parseInt(params.id);
        const { name, imageUrl, pricePerMeter, available } = await request.json();

        const db = getDatabase();
        (await db.prepare(
                    'UPDATE designs SET name = ?, image_url = ?, price_per_meter = ?, available = ? WHERE id = ? AND business_id = ?'
                ).run(name, imageUrl, pricePerMeter, available ? 1 : 0, designId, businessId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Design update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = payload.businessId;

        const params = await context.params;
        const designId = parseInt(params.id);

        const db = getDatabase();
        (await db.prepare('DELETE FROM designs WHERE id = ? AND business_id = ?').run(designId, businessId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Design delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
