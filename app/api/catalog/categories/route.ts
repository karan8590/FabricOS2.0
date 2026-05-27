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

export async function GET(request: Request) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = getDatabase();
        const result = await db.query(
            `SELECT * FROM catalog_categories 
             WHERE business_id = $1 
             ORDER BY is_favorite DESC, favorite_order ASC, name ASC`,
            [payload.businessId]
        );

        return NextResponse.json({ categories: result.rows });
    } catch (error) {
        console.error('[Catalog Categories GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await getAuth();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, isFavorite = false } = await request.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        const db = getDatabase();
        const result = await db.query(
            `INSERT INTO catalog_categories (business_id, name, is_favorite)
             VALUES ($1, $2, $3)
             ON CONFLICT (business_id, name) DO UPDATE SET is_favorite = $3
             RETURNING *`,
            [payload.businessId, name.trim(), isFavorite]
        );

        return NextResponse.json({ category: result.rows[0] });
    } catch (error) {
        console.error('[Catalog Categories POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
