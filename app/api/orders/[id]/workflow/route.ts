import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status, user } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const body = await request.json();
        let { action, notes } = body;
        const orderId = parseInt(params.id);

        const db = getDatabase();

        const order = (await db.prepare(`
            SELECT o.*, c.name as customer_name, d.name as design_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.id = ? AND o.business_id = ?
        `).get(orderId, businessId)) as any;

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const orderStage = order.order_stage || 'order_added';
        const now = Math.floor(Date.now() / 1000);

        return await db.transaction(async () => {
            let nextOrderStage = orderStage;
            let nextEmbroideryStatus = order.embroidery_status;
            let nextPrintingStatus = order.printing_status;
            let nextDyeingStatus = order.dyeing_status;
            let title = '';

            if (action === 'approve') {
                if (orderStage !== 'order_added') throw new Error(`Cannot approve order in stage: ${orderStage}`);
                nextOrderStage = 'approved';
                title = 'Order Approved';

                const fabricType = order.fabric_type || 'Polyester';
                const availableMaterials = (await db.prepare(`
                    SELECT *
                    FROM inventory_materials 
                    WHERE name = ? AND category = 'Fabric' AND business_id = ? AND COALESCE(is_deleted, false) = false
                    ORDER BY last_purchase_date ASC, id ASC
                `).all(fabricType, businessId)) as any[];

                const { computeInventory } = await import('@/lib/inventory');
                
                // Fetch history for these materials
                const matIds = availableMaterials.map(m => m.id);
                let historyByMat: Record<number, any[]> = {};
                if (matIds.length > 0) {
                    const placeholders = matIds.map(() => '?').join(',');
                    const hist = (await db.prepare(`SELECT * FROM inventory_history WHERE material_id IN (${placeholders}) AND business_id = ? AND COALESCE(is_deleted, false) = false`).all(...matIds, businessId)) as any[];
                    for (const h of hist) {
                        if (!historyByMat[h.material_id]) historyByMat[h.material_id] = [];
                        historyByMat[h.material_id].push(h);
                    }
                }
                
                for (const m of availableMaterials) {
                    const calc = computeInventory(historyByMat[m.id] || []);
                    m.real_available = calc.available;
                    m.real_reserved = calc.reserved;
                }

                const totalAvailable = availableMaterials.reduce((sum, m) => sum + m.real_available, 0);
                if (totalAvailable < order.quantity_meters) {
                    throw new Error(`Not enough ${fabricType} fabric available. Required: ${order.quantity_meters}m, Available: ${totalAvailable}m`);
                }

                let remainingMetersToDeduct = order.quantity_meters;
                for (const material of availableMaterials) {
                    if (remainingMetersToDeduct <= 0) break;
                    
                    if (material.real_available <= 0) continue;

                    const reservation = Math.min(material.real_available, remainingMetersToDeduct);
                    const newAvailable = material.real_available - reservation;
                    const newReserved = material.real_reserved + reservation;
                    
                    await db.prepare(`
                        UPDATE inventory_materials 
                        SET available_stock = ?, reserved_stock = ?
                        WHERE id = ? AND business_id = ?
                    `).run(newAvailable, newReserved, material.id, businessId);
                    
                    await db.prepare(`
                        INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, linked_order_id, user_id)
                        VALUES (?, ?, 'Reserved', ?, ?, ?, ?, ?, ?)
                    `).run(businessId, material.id, reservation, material.real_available, newAvailable, `Reserved for Order #${order.order_number || order.id}`, order.id, user?.id || 1);

                    remainingMetersToDeduct -= reservation;
                }
            } else if (action === 'mark_printing') {
                if (orderStage !== 'embroidery' || order.embroidery_status !== 'in_progress') throw new Error(`Cannot mark printing from current state`);
                
                const { completionDate } = body;
                
                nextOrderStage = 'printing';
                nextEmbroideryStatus = 'completed';
                nextPrintingStatus = 'in_progress';
                title = 'Printing Completed';

            } else if (action === 'mark_ready') {
                if (orderStage !== 'dyeing' || order.dyeing_status !== 'in_progress') throw new Error(`Cannot mark ready from current state`);
                nextOrderStage = 'ready';
                nextDyeingStatus = 'completed';
                title = 'Ready for Delivery';
            } else if (action === 'mark_delivered') {
                if (orderStage !== 'out_for_delivery') throw new Error(`Cannot mark delivered from current state`);
                nextOrderStage = 'delivered';
                title = 'Delivered';

                const fabricType = order.fabric_type || 'Polyester';
                const reservedMaterials = (await db.prepare(`
                    SELECT id, available_stock, reserved_stock, used_stock 
                    FROM inventory_materials 
                    WHERE name = ? AND category = 'Fabric' AND business_id = ? AND reserved_stock > 0
                    ORDER BY id ASC
                `).all(fabricType, businessId)) as any[];

                let remainingMetersToConsume = order.quantity_meters;
                for (const material of reservedMaterials) {
                    if (remainingMetersToConsume <= 0) break;
                    
                    const consumption = Math.min(Number(material.reserved_stock), remainingMetersToConsume);
                    const newReserved = Number(material.reserved_stock) - consumption;
                    const newUsed = Number(material.used_stock) + consumption;
                    
                    await db.prepare(`
                        UPDATE inventory_materials 
                        SET reserved_stock = ?, used_stock = ?
                        WHERE id = ? AND business_id = ?
                    `).run(newReserved, newUsed, material.id, businessId);
                    
                    await db.prepare(`
                        INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, linked_order_id, user_id)
                        VALUES (?, ?, 'Consumed', ?, ?, ?, ?, ?, ?)
                    `).run(businessId, material.id, consumption, material.reserved_stock, newReserved, `Consumed for Order #${order.order_number || order.id}`, order.id, user?.id || 1);

                    remainingMetersToConsume -= consumption;
                }
            } else {
                throw new Error(`Unknown workflow action: ${action}`);
            }

            // Update order stages
            await db.prepare(`
                UPDATE orders 
                SET order_stage = ?, embroidery_status = ?, printing_status = ?, dyeing_status = ?
                WHERE id = ? AND business_id = ?
            `).run(nextOrderStage, nextEmbroideryStatus, nextPrintingStatus, nextDyeingStatus, orderId, businessId);

            // Log activity
            await db.prepare(`
                INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                businessId, order.customer_id, 'production_workflow', title, 
                notes || `Order moved to ${nextOrderStage}`,
                JSON.stringify({ order_id: orderId, action, from: orderStage, to: nextOrderStage }), 
                now
            );

            try {
                const tgMsg = `🔄 *Status Updated*\nOrder #${order.order_number || order.id} (${order.customer_name})\nMoved to: *${title}*`;
                sendTelegramMessage({ english: tgMsg, gujarati: tgMsg }, 'instant_order_alerts').catch(() => {});
            } catch(e) {}

            return NextResponse.json({ success: true, order_stage: nextOrderStage });

        })();
    } catch (error: any) {
        console.error('Workflow Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
