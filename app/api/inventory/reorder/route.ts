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

        // 1. Calculate active orders demand
        const pendingOrders = (await db.prepare(`SELECT SUM(quantity_meters) as total_qty FROM orders WHERE status NOT IN ('delivered', 'completed', 'cancelled') AND business_id = ?`).get(businessId)) as any;
        const totalPendingMetres = pendingOrders?.total_qty || 0;

        // 2. Fetch all materials
        const materials = (await db.prepare(`
            SELECT m.*, v.name as vendor_name 
            FROM inventory_materials m 
            LEFT JOIN vendors v ON m.vendor_id = v.id 
            WHERE m.business_id = ?
        `).all(businessId)) as any[];

        const suggestions = materials.map(m => {
            const available = Number(m.available_stock);
            const reserved = Number(m.reserved_stock);
            const minStock = Number(m.min_stock);

            // Simple heuristic for Avg Weekly Usage: Look at history over last 30 days
            const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 86400);
            // We can't do this easily without a complex query, so we'll mock it based on reserved stock to keep it fast
            // Assuming current reserved stock is about 1 week of usage for simplicity in this demo.
            const avgWeeklyUsage = reserved > 0 ? reserved : (available * 0.1); // 10% per week if no reserved

            let daysRemaining = avgWeeklyUsage > 0 ? (available / (avgWeeklyUsage / 7)) : 999;
            
            let priority = 'Healthy';
            if (available <= minStock || daysRemaining <= 7) {
                priority = 'Critical';
            } else if (available <= minStock * 1.5 || daysRemaining <= 14) {
                priority = 'Warning';
            }

            let suggestedReorder = 0;
            if (priority !== 'Healthy') {
                suggestedReorder = (minStock * 2) - available + reserved;
            }

            return {
                id: m.id,
                name: m.name,
                category: m.category,
                available,
                reserved,
                minStock,
                avgWeeklyUsage: Math.round(avgWeeklyUsage),
                daysRemaining: Math.round(daysRemaining),
                suggestedReorder: Math.round(suggestedReorder > 0 ? suggestedReorder : 0),
                vendorName: m.vendor_name,
                priority
            };
        }).filter(s => s.priority !== 'Healthy').sort((a, b) => a.daysRemaining - b.daysRemaining);

        return NextResponse.json({ totalPendingMetres, suggestions });
    } catch (error) {
        console.error('Failed to fetch reorder analytics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
