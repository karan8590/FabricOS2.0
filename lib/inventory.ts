export function computeInventory(movements: any[]) {
    let purchased = 0;
    let reserved = 0;
    let used = 0;

    (movements || []).forEach((m) => {
        // Skip deleted entries
        if (m.is_deleted) return;

        const type = (m.action_type || m.type || '').toLowerCase();
        
        // Map different string formats used across the app
        if (type === 'purchase') purchased += Number(m.quantity || 0);
        if (type === 'reserved') reserved += Number(m.quantity || 0);
        if (type === 'used' || type === 'consumed' || type === 'consumption') used += Number(m.quantity || 0);
        if (type === 'release' || type === 'released') reserved -= Number(m.quantity || 0); // Releasing reservation
        if (type === 'return' || type === 'returned') purchased -= Number(m.quantity || 0); // Returning purchased material
    });

    // Ensure we don't return negative numbers for totals (except maybe available)
    purchased = Math.max(0, purchased);
    reserved = Math.max(0, reserved);
    used = Math.max(0, used);

    return {
        purchased,
        reserved,
        used,
        available: purchased - reserved - used,
    };
}

// Keep a backward compatible helper for places where we ALREADY attach these pre-computed values 
// to the material object itself.
export function getAvailableInventory(material: any): number {
    if (!material) return 0;
    
    // If we've already attached the dynamically computed stats (which we should everywhere now)
    if (typeof material.computed_available !== 'undefined') return Number(material.computed_available);
    if (typeof material.available_quantity !== 'undefined') return Number(material.available_quantity);
    
    // As an absolute fallback (should be avoided now):
    const purchased = Number(material.purchased_stock || material.purchased_quantity || material.total_stock || material.available_stock || 0);
    const reserved = Number(material.reserved_stock || material.reserved_quantity || 0);
    const used = Number(material.used_stock || material.used_quantity || 0);
    
    return Math.max(0, purchased - reserved - used);
}
