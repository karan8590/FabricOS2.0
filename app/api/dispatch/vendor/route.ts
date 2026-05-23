import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const db = getDatabase();

        const vendorDispatches = (await db.prepare(`
            SELECT 
                vd.*,
                v.name as vendor_name,
                o.order_number,
                c.name as customer_name
            FROM vendor_dispatches vd
            JOIN vendors v ON vd.vendor_id = v.id
            JOIN orders o ON vd.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            WHERE vd.business_id = ?
            ORDER BY vd.created_at DESC
        `).all(businessId));

        return NextResponse.json(vendorDispatches);
    } catch (error: any) {
        console.error('Vendor Dispatches GET Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
