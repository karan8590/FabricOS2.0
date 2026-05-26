import getDatabase from '@/lib/db';

export function calculateMaterialSummary(history: any[]) {
    // Only used for backwards compatibility or UI modal summary, 
    // NOT used for the main sync logic anymore.
    let purchased = 0;
    let reserved = 0;
    let released = 0;
    let consumed = 0;
    let totalProcurementValue = 0;

    for (const h of history) {
        if (h.is_deleted) continue; // Ignore soft deleted
        
        const qty = Number(h.quantity || 0);
        const cost = Number(h.total_cost || 0);

        if (h.action_type === 'Purchase') {
            purchased += qty;
            totalProcurementValue += cost;
        } else if (h.action_type === 'Reserved') {
            reserved += qty;
        } else if (h.action_type === 'Release' || h.action_type === 'Released') {
            released += qty;
        } else if (['Used', 'Consumed', 'Consumption'].includes(h.action_type)) {
            consumed += qty;
        }
    }

    const available = Math.max(0, purchased - reserved + released);
    const finalReserved = Math.max(0, reserved - released - consumed);

    return {
        purchased,
        available,
        reserved: finalReserved,
        used: consumed,
        totalProcurementValue
    };
}

export async function syncAllMaterialStocks(db: any, businessId: string) {
    const materials = await db.prepare('SELECT id FROM inventory_materials WHERE business_id = ?').all(businessId);
    
    for (const m of materials) {
        // 1. Calculate Purchased from History
        const purchasedQuery = await db.prepare(`
            SELECT COALESCE(SUM(quantity), 0) as total_purchased 
            FROM inventory_history 
            WHERE material_id = ? AND business_id = ? 
            AND action_type = 'Purchase' 
            AND COALESCE(is_deleted, false) = false
        `).get(m.id, businessId) as any;
        const purchased = Number(purchasedQuery.total_purchased || 0);

        // 2. Calculate Dynamically Reserved from ACTIVE orders only
        // Using correct new workflow stages
        const activeStatuses = ['approved', 'embroidery', 'printing', 'dyeing', 'ready'];
        const statusPlaceholders = activeStatuses.map(() => '?').join(',');
        const reservedQuery = await db.prepare(`
            SELECT COALESCE(SUM(h.quantity), 0) as total_reserved
            FROM inventory_history h
            JOIN orders o ON h.linked_order_id = o.id
            WHERE h.material_id = ? 
            AND h.business_id = ?
            AND h.action_type = 'Reserved'
            AND o.status IN (${statusPlaceholders})
        `).get(m.id, businessId, ...activeStatuses) as any;
        const reserved = Number(reservedQuery.total_reserved || 0);

        // 3. Calculate Dynamically Used from COMPLETED/DELIVERED orders AND manual Consumption
        // This includes explicit 'Used' rows (like manual consumption) OR 'Reserved' rows tied to completed orders
        const completedStatuses = ['dispatched', 'delivered', 'completed'];
        const compStatusPlaceholders = completedStatuses.map(() => '?').join(',');
        
        const usedFromOrdersQuery = await db.prepare(`
            SELECT COALESCE(SUM(h.quantity), 0) as total_used_orders
            FROM inventory_history h
            JOIN orders o ON h.linked_order_id = o.id
            WHERE h.material_id = ? 
            AND h.business_id = ?
            AND h.action_type = 'Reserved'
            AND o.status IN (${compStatusPlaceholders})
        `).get(m.id, businessId, ...completedStatuses) as any;

        const usedManualQuery = await db.prepare(`
            SELECT COALESCE(SUM(quantity), 0) as total_used_manual
            FROM inventory_history 
            WHERE material_id = ? AND business_id = ? 
            AND action_type IN ('Used', 'Consumed', 'Consumption')
            AND COALESCE(is_deleted, false) = false
        `).get(m.id, businessId) as any;

        const used = Number(usedFromOrdersQuery.total_used_orders || 0) + Number(usedManualQuery.total_used_manual || 0);

        // 4. Calculate Available (Formula: Available = Purchased - Reserved - Used)
        const available = Math.max(0, purchased - reserved - used);

        await db.prepare(`
            UPDATE inventory_materials 
            SET available_stock = ?, reserved_stock = ?, used_stock = ?
            WHERE id = ? AND business_id = ?
        `).run(available, reserved, used, m.id, businessId);
    }
}

