import getDatabase from '@/lib/db';

export async function syncInventoryMaterial(db: any, materialId: number, businessId: string) {
    const history = await db.prepare(`
        SELECT action_type, quantity, is_deleted 
        FROM inventory_history 
        WHERE material_id = ? AND business_id = ?
    `).all(materialId, businessId);

    let purchased = 0;
    let reserved = 0;
    let released = 0;
    let consumed = 0;

    for (const h of history) {
        const qty = Number(h.quantity || 0);
        // Ignore deleted/inactive for calculations?
        // If the user wants to see a release movement in history, they don't want it to double-deduct.
        if (h.is_deleted) continue;

        if (h.action_type === 'Purchase') purchased += qty;
        else if (h.action_type === 'Reserved') reserved += qty;
        else if (h.action_type === 'Release' || h.action_type === 'Released') released += qty;
        else if (['Used', 'Consumed', 'Consumption'].includes(h.action_type)) consumed += qty;
    }

    const available = purchased - reserved + released;
    const finalReserved = reserved - released - consumed;

    await db.prepare(`
        UPDATE inventory_materials 
        SET available_stock = ?, reserved_stock = ?, used_stock = ?
        WHERE id = ? AND business_id = ?
    `).run(available, Math.max(0, finalReserved), consumed, materialId, businessId);

    return { available, reserved: Math.max(0, finalReserved), consumed };
}
