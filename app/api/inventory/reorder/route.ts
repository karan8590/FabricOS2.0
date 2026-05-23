import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('inventory.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId;
        const db = getDatabase();

        // 1. Get settings
        const settingsRaw = (await db.prepare(`SELECT key, value FROM settings WHERE business_id = ?`).all(businessId)) as any[];
        const settings = settingsRaw.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
        const inkConsumptionPerMetre = parseFloat(settings['ink_consumption_per_m'] || '0.05');
        const reorderBufferPercent = parseFloat(settings['reorder_buffer_percent'] || '20');

        // 2. Pending orders metres
        const pendingOrders = (await db.prepare(`
            SELECT quantity_meters 
            FROM orders 
            WHERE business_id = ? AND status IN ('approved', 'embroidery', 'printing', 'dyeing', 'ready')
        `).all(businessId)) as any[];
        
        const totalPendingMetres = pendingOrders.reduce((sum, ord) => sum + parseFloat(ord.quantity_meters || '0'), 0);

        // 3. Ink stock and calculation
        const inkStock = (await db.prepare(`SELECT * FROM inventory_ink WHERE business_id = ?`).all(businessId)) as any[];
        const inkSuggestions = inkStock.map(ink => {
            const pendingNeed = totalPendingMetres * inkConsumptionPerMetre;
            const currentStock = parseFloat(ink.current_balance || '0');
            const shortfall = Math.max(0, pendingNeed - currentStock);
            const suggestedReorder = Math.ceil(shortfall * (1 + reorderBufferPercent / 100));
            
            return {
                ...ink,
                pendingNeed,
                suggestedReorder,
                status: suggestedReorder > 0 ? 'reorder' : 'ok'
            };
        });

        // 4. Packaging stock and calculation
        const packagingStock = (await db.prepare(`SELECT * FROM inventory_packaging WHERE business_id = ?`).all(businessId)) as any[];
        
        // Count number of pending orders (each needs 1 cover/tag ideally, or we can assume 1 order = 1 piece of packaging for simplicity, or 1 roll = X orders)
        // Without complex logic, let's say average covers per order = 1
        const pendingOrdersCount = pendingOrders.length;
        
        const packagingSuggestions = packagingStock.map(pkg => {
            const currentStock = parseFloat(pkg.current_stock || '0');
            // assuming 1 unit of packaging per order for now, unless it's rolls which might be different.
            // A simple logic: if stock < pending orders, suggest reorder.
            const pendingNeed = pkg.type === 'Roll' ? Math.ceil(pendingOrdersCount / 10) : pendingOrdersCount; 
            const shortfall = Math.max(0, pendingNeed - currentStock);
            const suggestedReorder = Math.ceil(shortfall * (1 + reorderBufferPercent / 100));

            return {
                ...pkg,
                pendingNeed,
                suggestedReorder,
                status: suggestedReorder > 0 ? 'reorder' : 'ok'
            };
        });

        return NextResponse.json({
            settings: { inkConsumptionPerMetre, reorderBufferPercent },
            totalPendingMetres,
            pendingOrdersCount,
            inkSuggestions,
            packagingSuggestions
        });

    } catch (error) {
        console.error('Failed to fetch reorder suggestions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
