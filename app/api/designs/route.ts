import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const businessId = payload.businessId;

        const { searchParams } = new URL(request.url);
        const available = searchParams.get('available');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const search = searchParams.get('search');

        const db = getDatabase();
        let query = 'SELECT * FROM designs WHERE 1=1 AND business_id = ?';
        const params: any[] = [businessId];

        // Customers see only available designs
        if (payload.role === 'customer') {
            query += ' AND available = 1';
        } else if (available !== null) {
            query += ' AND available = ?';
            params.push(parseInt(available));
        }

        if (minPrice) {
            query += ' AND price_per_meter >= ?';
            params.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            query += ' AND price_per_meter <= ?';
            params.push(parseFloat(maxPrice));
        }

        if (search) {
            query += ' AND name LIKE ?';
            params.push(`%${search}%`);
        }

        query += ' ORDER BY created_at DESC';
        const designs = (await db.prepare(query).all(...params));

        return NextResponse.json({ designs });
    } catch (error) {
        console.error('Designs fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
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

        const { name, imageUrl, pricePerMeter, available } = await request.json();

        if (!name || !pricePerMeter) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        const result = (await db
                    .prepare(
                        'INSERT INTO designs (business_id, name, image_url, price_per_meter, available) VALUES (?, ?, ?, ?, ?)'
                    )
                    .run(businessId, name, imageUrl || '', pricePerMeter, available ? 1 : 0));

        return NextResponse.json({ success: true, designId: result.lastInsertRowid });
    } catch (error) {
        console.error('Design creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
