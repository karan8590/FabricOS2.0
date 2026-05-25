import getDatabase from '@/lib/db';

export function calculateMaterialSummary(history: any[]) {
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
        const history = await db.prepare(`SELECT * FROM inventory_history WHERE material_id = ? AND business_id = ? AND COALESCE(is_deleted, false) = false`).all(m.id, businessId);
        
        const summary = calculateMaterialSummary(history);
        
        await db.prepare(`
            UPDATE inventory_materials 
            SET available_stock = ?, reserved_stock = ?, used_stock = ?
            WHERE id = ? AND business_id = ?
        `).run(summary.available, summary.reserved, summary.used, m.id, businessId);
    }
}
