import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { validateGSTIN } from '@/lib/gst';

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
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

        const params = await context.params;
        const vendorId = parseInt(params.id);
        const { name, contact, materialSupplied, balance, vendorType, gstNo, state, stateCode } = await request.json();

        if (gstNo) {
            const cleanGst = gstNo.trim().toUpperCase();
            const val = validateGSTIN(cleanGst, stateCode);
            if (!val.valid) {
                return NextResponse.json({ error: val.error }, { status: 400 });
            }
        }

        const db = getDatabase();
        (await db.prepare(
                    'UPDATE vendors SET name = ?, contact = ?, material_supplied = ?, balance = ?, vendor_type = ?, gst_no = ?, state = ?, state_code = ? WHERE id = ? AND business_id = ?'
                ).run(
                    name, 
                    contact, 
                    materialSupplied, 
                    balance, 
                    vendorType || 'Fabric Supplier', 
                    gstNo ? gstNo.trim().toUpperCase() : null, 
                    state || null, 
                    stateCode || null, 
                    vendorId,
                    businessId
                ));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vendor update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
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

        const params = await context.params;
        const vendorId = parseInt(params.id);

        const db = getDatabase();

        // 1. Check if vendor exists and has balance
        const vendor = await db.prepare('SELECT balance FROM vendors WHERE id = ? AND business_id = ?').get(vendorId, businessId) as any;
        if (!vendor) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }
        if (vendor.balance !== 0) {
            return NextResponse.json({ error: 'Cannot delete vendor with outstanding balance' }, { status: 400 });
        }

        // 2. Check for vendor payments
        const paymentsCount = await db.prepare('SELECT COUNT(*) as count FROM vendor_payments WHERE vendor_id = ?').get(vendorId) as any;
        if (paymentsCount.count > 0) {
            return NextResponse.json({ error: 'Cannot delete vendor with existing payment records' }, { status: 400 });
        }

        // 3. Check for vendor dispatches (Job Work / Embroidery)
        const dispatchesCount = await db.prepare('SELECT COUNT(*) as count FROM vendor_dispatches WHERE vendor_id = ?').get(vendorId) as any;
        if (dispatchesCount.count > 0) {
            return NextResponse.json({ error: 'Cannot delete vendor with existing dispatch history' }, { status: 400 });
        }

        // 4. Check for dispatch batches (Transport)
        const transportCount = await db.prepare('SELECT COUNT(*) as count FROM dispatch_batches WHERE transport_vendor_id = ?').get(vendorId) as any;
        if (transportCount.count > 0) {
            return NextResponse.json({ error: 'Cannot delete transport vendor linked to dispatch batches' }, { status: 400 });
        }

        (await db.prepare('DELETE FROM vendors WHERE id = ? AND business_id = ?').run(vendorId, businessId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vendor delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
