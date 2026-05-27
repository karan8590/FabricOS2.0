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

export async function GET(request: Request, context: any) {
    // Await params if using Next.js 15+ dynamic routes structure
    const params = await Promise.resolve(context.params);
    const designId = params.id;
    
    if (!designId) {
        return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
    }

    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = getDatabase();

        const variantQuery = `
            SELECT cv.*
            FROM catalog_variants cv
            JOIN catalog_designs cd ON cd.id = cv.design_id
            WHERE cv.design_id = $1 AND cd.business_id = $2
            ORDER BY cv.created_at ASC
        `;
        
        const variantsResult = await db.query(variantQuery, [designId, payload.businessId]);
        const variants = variantsResult.rows;

        const masterSheetsQuery = `
            SELECT ms.*
            FROM design_master_sheets ms
            JOIN catalog_designs cd ON cd.id = ms.design_id
            WHERE ms.design_id = $1 AND cd.business_id = $2
            ORDER BY ms.sort_order ASC, ms.created_at ASC
        `;
        
        const masterSheetsResult = await db.query(masterSheetsQuery, [designId, payload.businessId]);
        const masterSheets = masterSheetsResult.rows;

        return NextResponse.json({ variants, masterSheets });

    } catch (error) {
        console.error('[Catalog Variants GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
