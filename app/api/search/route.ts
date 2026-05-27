import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        
        const businessId = payload.businessId;
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        
        if (!query.trim() || query.trim().length < 2) {
            return NextResponse.json({ results: {} });
        }
        
        const searchTerm = `%${query}%`;
        const db = getDatabase();

        const [
            ordersRes,
            customersRes,
            vendorsRes,
            invoicesRes,
            genChallansRes,
            dispChallansRes,
            employeesRes,
            catalogRes,
            dispatchesRes
        ] = await Promise.all([
            db.prepare(`
                SELECT o.id, o.order_number, o.status, o.order_stage, o.quantity_meters, o.total_price,
                       c.name as customer_name, d.name as design_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                JOIN designs d ON o.design_id = d.id
                WHERE o.business_id = ? AND (
                    o.order_number ILIKE ? OR
                    c.name ILIKE ? OR
                    d.name ILIKE ? OR
                    c.phone ILIKE ?
                )
                ORDER BY COALESCE(o.order_date, o.created_at) DESC, o.id DESC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm, searchTerm),
            
            db.prepare(`
                SELECT id, name, phone, gstin, state, outstanding_amount
                FROM customers
                WHERE business_id = ? AND (
                    name ILIKE ? OR
                    phone ILIKE ? OR
                    gstin ILIKE ?
                )
                ORDER BY name ASC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm),

            db.prepare(`
                SELECT id, name, contact as phone, vendor_type, balance, city
                FROM vendors
                WHERE business_id = ? AND (
                    name ILIKE ? OR
                    vendor_type ILIKE ? OR
                    contact ILIKE ?
                )
                ORDER BY name ASC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm),

            db.prepare(`
                SELECT i.id, i.invoice_number, i.amount, i.status, i.amount_paid,
                       c.name as customer_name
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.business_id = ? AND (
                    i.invoice_number ILIKE ? OR
                    c.name ILIKE ? OR
                    c.gstin ILIKE ?
                )
                ORDER BY i.id DESC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm),

            db.prepare(`
                SELECT id, challan_number, challan_type, transporter, vehicle_number, date, status
                FROM challans
                WHERE business_id = ? AND (
                    challan_number ILIKE ? OR
                    transporter ILIKE ? OR
                    vehicle_number ILIKE ?
                )
                ORDER BY id DESC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm),

            db.prepare(`
                SELECT dc.id, dc.challan_number, db.vehicle_number, v.name as transporter, dc.created_at
                FROM dispatch_challans dc
                JOIN dispatch_batches db ON dc.dispatch_id = db.id
                LEFT JOIN vendors v ON db.transport_vendor_id = v.id
                WHERE dc.business_id = ? AND (
                    dc.challan_number ILIKE ? OR
                    v.name ILIKE ? OR
                    db.vehicle_number ILIKE ?
                )
                ORDER BY dc.id DESC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm),

            db.prepare(`
                SELECT id, name, phone, role, is_active
                FROM users
                WHERE business_id = ? AND role != 'customer' AND (
                    name ILIKE ? OR
                    phone ILIKE ? OR
                    role ILIKE ?
                )
                ORDER BY name ASC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm),

            db.prepare(`
                SELECT id, name, category, price_per_meter, available
                FROM designs
                WHERE business_id = ? AND (
                    name ILIKE ? OR
                    category ILIKE ?
                )
                ORDER BY name ASC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm),

            db.prepare(`
                SELECT db.id, db.dispatch_number, db.vehicle_number, db.driver_name, db.route, db.status,
                       v.name as transport_vendor
                FROM dispatch_batches db
                LEFT JOIN vendors v ON db.transport_vendor_id = v.id
                WHERE db.business_id = ? AND (
                    db.dispatch_number ILIKE ? OR
                    db.vehicle_number ILIKE ? OR
                    db.route ILIKE ? OR
                    v.name ILIKE ?
                )
                ORDER BY db.id DESC
                LIMIT 6
            `).all(businessId, searchTerm, searchTerm, searchTerm, searchTerm)
        ]);

        // Merge and clean up Challans
        const mergedChallans = [
            ...(genChallansRes || []).map((c: any) => ({
                id: c.id,
                challan_number: c.challan_number,
                challan_type: c.challan_type,
                transporter: c.transporter || 'N/A',
                vehicle_number: c.vehicle_number || 'N/A',
                status: c.status
            })),
            ...(dispChallansRes || []).map((c: any) => ({
                id: c.id,
                challan_number: c.challan_number,
                challan_type: 'dispatch',
                transporter: c.transporter || 'N/A',
                vehicle_number: c.vehicle_number || 'N/A',
                status: 'closed' // Dispatch challans are typically generated upon close/dispatch
            }))
        ].slice(0, 6);

        const results = {
            orders: ordersRes || [],
            customers: customersRes || [],
            vendors: vendorsRes || [],
            invoices: invoicesRes || [],
            challans: mergedChallans,
            employees: employeesRes || [],
            catalog: catalogRes || [],
            dispatches: dispatchesRes || []
        };

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Global search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
