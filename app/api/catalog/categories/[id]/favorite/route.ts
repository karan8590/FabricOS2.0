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

export async function PATCH(request: Request, context: any) {
    const params = await Promise.resolve(context.params);
    const categoryId = params.id;
    
    if (!categoryId) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    try {
        const payload = await getAuth();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { isFavorite } = await request.json();
        const db = getDatabase();

        const result = await db.query(
            `UPDATE catalog_categories 
             SET is_favorite = $1, updated_at = NOW() 
             WHERE id = $2 AND business_id = $3
             RETURNING *`,
            [isFavorite, categoryId, payload.businessId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, category: result.rows[0] });
    } catch (error) {
        console.error('[Catalog Categories Favorite PATCH]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
