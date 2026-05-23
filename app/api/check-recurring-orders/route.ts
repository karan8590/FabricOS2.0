import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const db = getDatabase();
        const now = Math.floor(Date.now() / 1000);

        // Fetch all active recurring orders where next_due is <= now
        const recurringOrders = (await db.prepare(`
            SELECT * FROM orders 
            WHERE is_recurring = 1 
              AND recurring_active = 1 
              AND recurring_next_due <= ?
        `).all(now));

        const results = [];

        for (const parent of recurringOrders as any[]) {
            // Generate new order number
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(0, 6);
            const countRow = (await db.prepare(`SELECT COUNT(*) as c FROM orders WHERE created_at >= ?`).get(Math.floor(new Date().setHours(0,0,0,0)/1000))) as any;
            const newOrderNumber = `${dateStr}-${String(countRow.c + 1).padStart(4, '0')}`;

            // Create draft order
            const insertStmt = db.prepare(`
                INSERT INTO orders (
                    customer_id, design_id, quantity_meters, total_price, status, 
                    order_number, created_at, order_date, delivery_date, 
                    is_draft_from_recurring, recurring_parent_id, notes, business_id, priority, price_per_unit
                ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
            `);

            const deliveryDate = now + 7 * 24 * 60 * 60; // 7 days from now
            const notes = `Auto-created from recurring order #${parent.order_number || parent.id}`;

            const res = insertStmt.run(
                parent.customer_id, parent.design_id, parent.quantity_meters, parent.total_price,
                newOrderNumber, now, now, deliveryDate, 
                parent.id, notes, parent.business_id, parent.priority, parent.price_per_unit
            );

            // Update parent next due date (+7 days from current next due)
            const nextDue = parent.recurring_next_due + 7 * 24 * 60 * 60;
            (await db.prepare(`UPDATE orders SET recurring_next_due = ? WHERE id = ?`).run(nextDue, parent.id));

            // Fetch customer and design info for telegram
            const customer = (await db.prepare(`SELECT name FROM customers WHERE id = ?`).get(parent.customer_id)) as any;
            const design = (await db.prepare(`SELECT name FROM designs WHERE id = ?`).get(parent.design_id)) as any;

            // Send Telegram Notification
            const message = `🔄 <b>Recurring Order Draft Created</b>\n\nOriginal order: #${parent.order_number || parent.id}\nCustomer: ${customer?.name || 'Unknown'}\nDesign: ${design?.name || 'Unknown'}\nQuantity: ${parent.quantity_meters}m\nRate: ₹${parent.price_per_unit || (parent.total_price / parent.quantity_meters)}/m\nTotal: ₹${parent.total_price.toLocaleString('en-IN')}\n\nA draft order (#${newOrderNumber}) has been created for review.\nReply with /approve_${newOrderNumber} to approve or open FabricOS to review.`;
            
            // Get admins to notify
            const admins = (await db.prepare(`SELECT telegram_chat_id FROM telegram_recipients WHERE is_active = 1`).all());
            for (const admin of admins as any[]) {
                await sendTelegramMessage(admin.telegram_chat_id, message);
            }

            results.push(newOrderNumber);
        }

        return NextResponse.json({ success: true, processed: results.length, drafts: results });
    } catch (error: any) {
        console.error('Check recurring orders error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
