import getDatabase from '@/lib/db';

export async function cleanupOrphanReservations(db: any, businessId: string) {
    const orphans = (await db.prepare(`
        SELECT h.id, h.material_id, h.quantity, h.linked_order_id
        FROM inventory_history h 
        LEFT JOIN orders o ON h.linked_order_id = o.id 
        WHERE h.business_id = ? AND h.action_type = 'Reserved' AND h.linked_order_id IS NOT NULL AND o.id IS NULL
    `).all(businessId)) as any[];

    if (orphans.length > 0) {
        let totalRestored = 0;
        for (const orphan of orphans) {
            console.log(`[DEBUG] Deleting orphan reservation for missing Order ID: ${orphan.linked_order_id}`);
            // Restore stock
            await db.prepare(`
                UPDATE inventory_materials 
                SET available_stock = available_stock + ?, reserved_stock = reserved_stock - ?
                WHERE id = ? AND business_id = ?
            `).run(orphan.quantity, orphan.quantity, orphan.material_id, businessId);
            
            // Delete orphan record
            await db.prepare(`DELETE FROM inventory_history WHERE id = ?`).run(orphan.id);
            totalRestored += Number(orphan.quantity);
        }
        console.log(`[CLEANUP] Found ${orphans.length} orphan reservation entries. Restored ${totalRestored}m stock successfully.`);
    }
}
