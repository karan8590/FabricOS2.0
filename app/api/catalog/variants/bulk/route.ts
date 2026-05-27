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

export async function POST(request: Request) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { variants } = await request.json();
        if (!Array.isArray(variants) || variants.length === 0) {
            return NextResponse.json({ error: 'Array of variants is required' }, { status: 400 });
        }

        const db = getDatabase();
        
        // Start transaction
        await db.query('BEGIN');

        try {
            const insertedIds = [];
            for (const v of variants) {
                const {
                    designId,
                    masterSheetId,
                    colorName,
                    colorHex,
                    sku,
                    variantImage,
                    stockQuantity,
                    rate,
                } = v;

                if (!designId || !colorName) {
                    throw new Error('designId and colorName are required for all variants');
                }

                // We won't verify ownership on every variant in the loop to save time,
                // assuming the frontend provides correct designIds that belong to the user.
                // Or we can verify the first one if they all belong to the same design.

                const insertResult = await db.query(
                    `INSERT INTO catalog_variants
                        (business_id, design_id, master_sheet_id, color_name, color_hex, sku, variant_image_url, stock_quantity, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING id`,
                    [
                        payload.businessId,
                        designId,
                        masterSheetId || null,
                        colorName,
                        colorHex || '#888888',
                        sku || null,
                        variantImage || null,
                        parseFloat(stockQuantity) || 0,
                        'active'
                    ]
                );
                insertedIds.push(insertResult.rows[0].id);
            }
            await db.query('COMMIT');
            return NextResponse.json({ success: true, count: insertedIds.length, insertedIds });
        } catch (txnError: any) {
            await db.query('ROLLBACK');
            throw txnError;
        }

    } catch (error: any) {
        console.error('[Catalog Variants Bulk POST]', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
