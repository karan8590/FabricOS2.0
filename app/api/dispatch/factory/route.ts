import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const db = getDatabase();
        
        // Fetch orders currently in factory production or any production stage
        const query = `
            SELECT 
                orders.id,
                orders.order_number,
                orders.status,
                orders.quantity_meters,
                orders.total_price,
                orders.order_date,
                orders.created_at,
                customers.name as customer_name,
                customers.phone as customer_phone,
                designs.name as design_name,
                designs.price_per_meter
            FROM orders
            JOIN customers ON orders.customer_id = customers.id
            JOIN designs ON orders.design_id = designs.id
            WHERE orders.business_id = ? 
            AND orders.status IN ('approved', 'embroidery_in_progress', 'printing_in_factory', 'dyeing_in_progress', 'ready')
            ORDER BY COALESCE(orders.order_date, orders.created_at) DESC, orders.id DESC
        `;

        const orders = (await db.prepare(query).all(businessId)) as any[];

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Factory production fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
