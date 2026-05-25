import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { generateChallanPDFServer, ChallanPDFData } from '@/lib/pdf/generateChallanServer';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const challanId = parseInt(params.id);
        if (!challanId) return NextResponse.json({ error: 'Invalid challan ID' }, { status: 400 });

        const db = getDatabase();

        // 1. Fetch Challan Details
        const challan = await db.prepare(`
            SELECT c.*, d.dispatch_number, d.dispatch_date, d.vehicle_number, d.driver_name, d.driver_phone, d.route, d.notes
            FROM dispatch_challans c
            JOIN dispatch_batches d ON c.dispatch_id = d.id
            WHERE c.id = ? AND c.business_id = ?
        `).get(challanId, businessId) as any;

        if (!challan) {
            return NextResponse.json({ error: 'Challan not found' }, { status: 404 });
        }

        const business = (await db.prepare(`
            SELECT name, phone, gst_number as gstin, address, logo_url
            FROM businesses
            WHERE id = ?
        `).get(businessId)) as any;

        // 2. Fetch Customer Details
        const customer = await db.prepare(`
            SELECT name, phone, state, state_code, gstin, address
            FROM customers WHERE id = ? AND business_id = ?
        `).get(challan.customer_id, businessId) as any;

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // 3. Fetch Orders
        let orderIds = [];
        try {
            orderIds = JSON.parse(challan.order_ids);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid order data in challan' }, { status: 500 });
        }

        const placeholders = orderIds.map(() => '?').join(',');
        const ordersData = await db.prepare(`
            SELECT o.order_number, o.quantity_meters as quantity, o.fabric_type, d.name as design_name
            FROM orders o
            JOIN designs d ON o.design_id = d.id
            WHERE o.id IN (${placeholders}) AND o.business_id = ?
        `).all(...orderIds, businessId) as any[];

        const totalQty = ordersData.reduce((sum, o) => sum + Number(o.quantity), 0);

        const pdfData: ChallanPDFData = {
            challan_number: challan.challan_number,
            dispatch_number: challan.dispatch_number,
            dispatch_date: new Date(challan.dispatch_date).getTime() / 1000,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_gstin: customer.gstin,
            customer_address: customer.address,
            driver_name: challan.driver_name || challan.vehicle_number,
            vehicle_number: challan.vehicle_number,
            driver_phone: challan.driver_phone,
            route: challan.route,
            orders: ordersData.map(o => ({
                order_number: o.order_number,
                design_name: o.design_name,
                fabric_type: o.fabric_type,
                quantity: Number(o.quantity)
            })),
            total_quantity: totalQty,
            notes: challan.notes,
            seller_name: business?.name,
            seller_phone: business?.phone,
            seller_gstin: business?.gstin,
            seller_address: business?.address,
            seller_logo: business?.logo_url
        };

        const { buffer } = await generateChallanPDFServer(pdfData);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Challan_${challan.challan_number}.pdf"`
            }
        });

    } catch (error: any) {
        console.error('Challan PDF API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
