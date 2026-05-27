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

// ─── POST /api/catalog/variants ───────────────────────────────────────────────
// Creates a new color variant under an existing catalog_design.
export async function POST(request: Request) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const {
            designId,
            colorName,
            colorHex,
            sku,
            variantImage,
            stockQuantity,
            rate,
            status,
        } = await request.json();

        if (!designId || !colorName) {
            return NextResponse.json({ error: 'designId and colorName are required' }, { status: 400 });
        }

        const db = getDatabase();

        // Verify the design belongs to this business
        const verifyResult = await db.query(
            `SELECT id FROM catalog_designs WHERE id = $1 AND business_id = $2`,
            [designId, payload.businessId]
        );
        if (!verifyResult.rows[0]) return NextResponse.json({ error: 'Design not found' }, { status: 404 });

        const insertResult = await db.query(
            `INSERT INTO catalog_variants
                (business_id, design_id, color_name, color_hex, sku, variant_image_url, stock_quantity, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                payload.businessId,
                designId,
                colorName,
                colorHex || '#888888',
                sku || null,
                variantImage || null,
                stockQuantity || 0,
                status || 'active',
            ]
        );

        return NextResponse.json({ success: true, variantId: insertResult.rows[0].id });
    } catch (error) {
        console.error('[Catalog Variants POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
