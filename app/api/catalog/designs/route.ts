import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getAuth(allowCustomer = false) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    if (!allowCustomer && payload.role === 'customer') return null;
    return payload;
}

// ─── GET /api/catalog/designs ─────────────────────────────────────────────────
// Returns all catalog_designs for the business, each with their variants
// and computed totals (variant_count, total_stock).
export async function GET(request: Request) {
    try {
        const payload = await getAuth(true);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const fabric = searchParams.get('fabric') || '';
        const color = searchParams.get('color') || '';
        const inStock = searchParams.get('in_stock');

        const db = getDatabase();
        const businessId = payload.businessId;

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // 1. Fetch matching parent designs (with pagination)
        let designQuery = `
            SELECT 
                cd.*,
                COUNT(cv.id) AS variant_count,
                COALESCE(SUM(cv.stock_quantity), 0) AS total_stock,
                (
                    SELECT json_agg(json_build_object('id', v.id, 'color_hex', v.color_hex, 'color_name', v.color_name))
                    FROM (
                        SELECT id, color_hex, color_name 
                        FROM catalog_variants 
                        WHERE design_id = cd.id AND status != 'discontinued'
                        ORDER BY created_at ASC
                        LIMIT 6
                    ) v
                ) as preview_variants
            FROM catalog_designs cd
            LEFT JOIN catalog_variants cv ON cv.design_id = cd.id AND cv.status != 'discontinued'
            WHERE cd.business_id = $1
        `;
        const params: any[] = [businessId];
        let idx = 2;

        if (search) {
            designQuery += ` AND (cd.design_code ILIKE $${idx} OR cd.design_name ILIKE $${idx} OR cd.tags ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        if (category) {
            designQuery += ` AND cd.category = $${idx}`;
            params.push(category);
            idx++;
        }
        if (fabric) {
            designQuery += ` AND cd.fabric_type = $${idx}`;
            params.push(fabric);
            idx++;
        }
        
        // We cannot filter by color trivially in this aggregated query without a subquery or join condition on variants
        if (color) {
            designQuery += ` AND EXISTS (
                SELECT 1 FROM catalog_variants cv_filter
                WHERE cv_filter.design_id = cd.id 
                AND cv_filter.color_name ILIKE $${idx}
                AND cv_filter.status != 'discontinued'
            )`;
            params.push(`%${color}%`);
            idx++;
        }
        designQuery += ` GROUP BY cd.id`;

        if (inStock === '1') {
            designQuery += ` HAVING COALESCE(SUM(cv.stock_quantity), 0) > 0`;
        }

        designQuery += ` ORDER BY cd.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
        params.push(limit, offset);

        const designsResult = await db.query(designQuery, params);
        
        const designs = designsResult.rows.map(d => ({
            ...d,
            variant_count: parseInt(d.variant_count) || 0,
            total_stock: parseInt(d.total_stock) || 0,
            variants: [],
        }));

        console.log('[DEBUG GET] returned designs count:', designs.length, 'for business_id:', businessId);

        return NextResponse.json({ 
            designs,
            page,
            limit,
            hasMore: designs.length === limit
        });

    } catch (error) {
        console.error('[Catalog Designs GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── POST /api/catalog/designs ────────────────────────────────────────────────
// Creates a new parent catalog design (without variants).
export async function POST(request: Request) {
    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { designCode, designName, category, fabricType, baseRate, imageUrl, description, tags } =
            await request.json();

        if (!designCode || !designName) {
            return NextResponse.json({ error: 'design_code and design_name are required' }, { status: 400 });
        }

        const db = getDatabase();
        const insertResult = await db.query(
            `INSERT INTO catalog_designs
                (business_id, design_code, design_name, category, fabric_type, base_rate, image_url, description, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [payload.businessId, designCode, designName, category || null, fabricType || null,
             baseRate || 0, imageUrl || null, description || null, tags || null]
        );

        return NextResponse.json({ success: true, designId: insertResult.rows[0].id });
    } catch (error) {
        console.error('[Catalog Designs POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
