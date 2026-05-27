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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await context.params;
        const variantId = parseInt(id, 10);
        if (isNaN(variantId)) {
            return NextResponse.json({ error: 'Invalid variant ID' }, { status: 400 });
        }

        const body = await request.json();
        const { colorName, colorHex, sku, stockQuantity, rate } = body;

        const db = getDatabase();

        // Ensure variant belongs to business
        const checkRes = await db.query(
            `SELECT v.id FROM catalog_variants v
             JOIN catalog_designs d ON v.design_id = d.id
             WHERE v.id = $1 AND d.business_id = $2`,
            [variantId, payload.businessId]
        );

        if (checkRes.rowCount === 0) {
            return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
        }

        await db.query(
            `UPDATE catalog_variants 
             SET color_name = COALESCE($1, color_name),
                 color_hex = COALESCE($2, color_hex),
                 sku = $3,
                 stock_quantity = COALESCE($4, stock_quantity),
                 rate = $5,
                 updated_at = NOW()
             WHERE id = $6`,
            [
                colorName || null,
                colorHex || null,
                sku || null,
                stockQuantity !== undefined ? stockQuantity : null,
                rate !== undefined ? rate : null,
                variantId
            ]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PATCH Variant error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
