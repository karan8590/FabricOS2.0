import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

async function getAuth(allowCustomer = false) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    if (!allowCustomer && payload.role === 'customer') return null;
    return payload;
}

export async function GET(request: Request) {
    try {
        const payload = await getAuth(true);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = getDatabase();
        const businessId = payload.businessId;

        // 1. Get total designs and stock efficiently
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT cd.id) AS total_designs,
                COUNT(cv.id) AS total_variants,
                COALESCE(SUM(cv.stock_quantity), 0) AS total_stock
            FROM catalog_designs cd
            LEFT JOIN catalog_variants cv ON cv.design_id = cd.id AND cv.status != 'discontinued'
            WHERE cd.business_id = $1
        `;
        const statsResult = await db.query(statsQuery, [businessId]);
        const totals = statsResult.rows[0];

        // 2. Get unique categories and fabrics for filters
        const filtersQuery = `
            SELECT DISTINCT category, fabric_type
            FROM catalog_designs
            WHERE business_id = $1
        `;
        const filtersResult = await db.query(filtersQuery, [businessId]);
        
        const categories = Array.from(new Set(filtersResult.rows.map(r => r.category).filter(Boolean)));
        const fabrics = Array.from(new Set(filtersResult.rows.map(r => r.fabric_type).filter(Boolean)));

        return NextResponse.json({
            stats: {
                totalDesigns: parseInt(totals.total_designs) || 0,
                totalVariants: parseInt(totals.total_variants) || 0,
                totalStock: parseInt(totals.total_stock) || 0,
            },
            filters: {
                categories,
                fabrics,
            }
        });

    } catch (error) {
        console.error('[Catalog Stats GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
