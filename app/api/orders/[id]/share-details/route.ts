import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const params = await context.params;
        const orderId = parseInt(params.id);

        const db = getDatabase();

        // 1. Fetch Order Details
        const order = await db.prepare(`
            SELECT o.*, d.name as design_name, c.name as customer_name, c.phone as customer_phone
            FROM orders o
            JOIN designs d ON o.design_id = d.id
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ? AND o.business_id = ?
        `).get(orderId, businessId) as any;

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Fetch Business details for branding
        const business = await db.prepare(`
            SELECT name FROM businesses WHERE id = ?
        `).get(businessId) as any;
        const firmName = business?.name || 'FabricOS ERP';

        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

        // 3. Find Challan
        let publicChallanUrl = '';
        const allChallans = await db.prepare(`
            SELECT id, order_ids, challan_number FROM dispatch_challans WHERE business_id = ?
        `).all(businessId) as any[];

        const matchingChallan = allChallans.find(c => {
            try {
                const ids = JSON.parse(c.order_ids);
                return Array.isArray(ids) && ids.map(Number).includes(orderId);
            } catch (e) {
                return false;
            }
        });

        if (matchingChallan) {
            const token = jwt.sign(
                { type: 'challan', targetId: matchingChallan.id.toString(), businessId },
                JWT_SECRET,
                { expiresIn: '365d' }
            );
            const origin = new URL(request.url).origin;
            publicChallanUrl = `${origin}/api/public/challan/${matchingChallan.id}/pdf?token=${token}`;
        }

        // 4. Find Tracking Info or status label
        const stageMap: Record<string, string> = {
            order_added: 'Order Placed',
            approved: 'Approved & fabric inventory claimed',
            embroidery: 'Sent to Embroidery job work',
            printing: 'Printing in factory',
            dyeing: 'Sent to Dyeing job work',
            ready: 'Ready for Dispatch',
            out_for_delivery: 'Dispatched & Out for Delivery',
            delivered: 'Delivered successfully',
        };
        const currentStageLabel = stageMap[order.order_stage] || order.status || 'Order Placed';

        // Pack messages
        const summaryMsg = `Hi ${order.customer_name}, here is the summary of your order ${order.order_number || `#${order.id}`} (${order.design_name}):
- Quantity: ${parseFloat(order.quantity_meters || 0).toFixed(1)} Mtr
- Total Amount: ₹${parseFloat(order.total_price || 0).toLocaleString('en-IN')}
- Current Status: ${currentStageLabel}
Thank you, ${firmName}.`;

        const dispatchMsg = publicChallanUrl 
            ? `Hi ${order.customer_name}, your order ${order.order_number || `#${order.id}`} (${order.design_name}) has been dispatched! Please view/download your Delivery Challan here: ${publicChallanUrl}. Thank you, ${firmName}.`
            : `Hi ${order.customer_name}, your order ${order.order_number || `#${order.id}`} (${order.design_name}) dispatch process has initiated. Details will be shared shortly. Thank you, ${firmName}.`;

        const trackingMsg = `Hi ${order.customer_name}, your order ${order.order_number || `#${order.id}`} (${order.design_name}) update:
- Status: ${currentStageLabel}
We are processing it as per schedule. Thank you, ${firmName}.`;

        return NextResponse.json({
            phone: order.customer_phone,
            name: order.customer_name,
            summaryMessage: summaryMsg,
            dispatchMessage: dispatchMsg,
            trackingMessage: trackingMsg,
            hasChallan: !!matchingChallan
        });

    } catch (err: any) {
        console.error('Order share-details error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
