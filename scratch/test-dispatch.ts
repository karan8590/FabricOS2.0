import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

async function test() {
    const db = getDatabase();
    const pendingOrders = await db.prepare(`
        SELECT 
            o.id, o.order_number, o.status, o.dispatch_status, o.dispatch_type, o.queued_at, o.quantity_meters as quantity, 
            c.name as customer_name, d.name as design_name, d.design_number,
            o.fabric_type, o.queued_vendor_id, v.name as vendor_name, o.queued_expected_date,
            o.queued_rate, o.queued_notes, o.queued_generate_challan
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN designs d ON o.design_id = d.id
        LEFT JOIN vendors v ON o.queued_vendor_id = v.id
        WHERE o.business_id = 'business_015817' AND o.dispatch_status = 'queued'
    `).all();
    console.log("Pending Orders:", pendingOrders);
}
test().catch(console.error);
