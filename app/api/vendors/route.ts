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
        const type = searchParams.get('type') || searchParams.get('vendor_type');

        const db = getDatabase();
        let query = 'SELECT * FROM vendors WHERE 1=1 AND business_id = ?';
        const params: any[] = [businessId];

        if (type) {
            query += ' AND vendor_type = ?';
            params.push(type.toLowerCase());
        }

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

        const { 
            name, contact, altPhone, email, materialSupplied, balance, vendorType, 
            gstNo, state, stateCode, address, rateType, paymentTerms, 
            upiId, bankName, accountNumber, ifscCode, notes, status,
            vehicleNumber, driverName, vehicleType, defaultRoute
        } = await request.json();

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
                        `INSERT INTO vendors (
                            business_id, name, contact, alt_phone, email, material_supplied, balance, vendor_type, 
                            gst_no, state, state_code, address, rate_type, payment_terms, upi_id, bank_name, 
                            account_number, ifsc_code, notes, status, vehicle_number, driver_name, vehicle_type, default_route
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    )
                    .run(
                        businessId, name, contact, altPhone || null, email || null, materialSupplied, balance || 0, vendorType || 'Fabric Supplier',
                        gstNo ? gstNo.trim().toUpperCase() : null, state || null, stateCode || null,
                        address || null, rateType || null, paymentTerms || null, upiId || null,
                        bankName || null, accountNumber || null, ifscCode || null, notes || null, status || 'active',
                        vehicleNumber || null, driverName || null, vehicleType || null, defaultRoute || null
                    ));

        const newVendorId = Number(result.lastInsertRowid);
        const vendor = {
            id: newVendorId, name, contact, alt_phone: altPhone || null, email: email || null,
            material_supplied: materialSupplied, balance: balance || 0, vendor_type: vendorType || 'Fabric Supplier',
            gst_no: gstNo ? gstNo.trim().toUpperCase() : null, state: state || null, state_code: stateCode || null,
            address: address || null, rate_type: rateType || null, payment_terms: paymentTerms || null,
            upi_id: upiId || null, bank_name: bankName || null, account_number: accountNumber || null,
            ifsc_code: ifscCode || null, notes: notes || null, status: status || 'active',
            vehicle_number: vehicleNumber || null, driver_name: driverName || null, 
            vehicle_type: vehicleType || null, default_route: defaultRoute || null
        };

        return NextResponse.json({ success: true, vendorId: newVendorId, vendor });
    } catch (error) {
        console.error('Vendor creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
