import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const orderId = parseInt(params.id);
        const db = getDatabase();

        // Get activities for this specific order
        // meta contains {"order_id": ID} 
        const activities = (await db.prepare(`
            SELECT * FROM activity
            WHERE business_id = ? AND type = 'production_workflow'
            ORDER BY created_at DESC
        `).all(businessId)) as any[];
        
        // Filter out the ones for this order, because JSON querying in SQLite can be tricky
        // if not configured properly with JSON1 extension.
        const orderActivities = activities.filter(a => {
            if (!a.meta) return false;
            try {
                const meta = JSON.parse(a.meta);
                return meta.order_id === orderId;
            } catch (e) {
                return false;
            }
        });

        return NextResponse.json({ activities: orderActivities });
    } catch (error: any) {
        console.error('Activities Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
