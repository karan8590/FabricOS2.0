import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { validateGSTIN } from '@/lib/gst';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role === 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = payload.businessId;

        const { searchParams } = new URL(request.url);
        const materialSupplied = searchParams.get('materialSupplied');
        const minBalance = searchParams.get('minBalance');
        const maxBalance = searchParams.get('maxBalance');
        const search = searchParams.get('search');

        const db = getDatabase();
        let query = 'SELECT * FROM vendors WHERE 1=1 AND business_id = ?';
        const params: any[] = [businessId];

        if (materialSupplied) {
            query += ' AND material_supplied = ?';
            params.push(materialSupplied);
        }

        if (minBalance) {
            query += ' AND balance >= ?';
            params.push(parseFloat(minBalance));
        }
        if (maxBalance) {
            query += ' AND balance <= ?';
            params.push(parseFloat(maxBalance));
        }

        if (search) {
            query += ' AND (name LIKE ? OR contact LIKE ? OR material_supplied LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += ' ORDER BY created_at DESC';
        const vendors = (await db.prepare(query).all(...params));

        return NextResponse.json({ vendors });
    } catch (error) {
        console.error('Vendors fetch error:', error);
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
        if (!payload || payload.role === 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = payload.businessId;

        const { name, contact, materialSupplied, balance, vendorType, gstNo, state, stateCode } = await request.json();

        if (!name || !contact || !materialSupplied) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (gstNo) {
            const cleanGst = gstNo.trim().toUpperCase();
            const val = validateGSTIN(cleanGst, stateCode);
            if (!val.valid) {
                return NextResponse.json({ error: val.error }, { status: 400 });
            }
        }

        const db = getDatabase();
        const result = (await db
                    .prepare(
                        'INSERT INTO vendors (business_id, name, contact, material_supplied, balance, vendor_type, gst_no, state, state_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    )
                    .run(
                        businessId,
                        name, 
                        contact, 
                        materialSupplied, 
                        balance || 0, 
                        vendorType || 'Fabric Supplier',
                        gstNo ? gstNo.trim().toUpperCase() : null,
                        state || null,
                        stateCode || null
                    ));

        const newVendorId = Number(result.lastInsertRowid);
        const vendor = {
            id: newVendorId,
            name,
            contact,
            material_supplied: materialSupplied,
            balance: balance || 0,
            vendor_type: vendorType || 'Fabric Supplier',
            gst_no: gstNo ? gstNo.trim().toUpperCase() : null,
            state: state || null,
            state_code: stateCode || null,
        };

        return NextResponse.json({ success: true, vendorId: newVendorId, vendor });
    } catch (error) {
        console.error('Vendor creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
