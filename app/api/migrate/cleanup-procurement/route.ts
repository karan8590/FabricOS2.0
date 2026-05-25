import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function GET(request: Request) {
    try {
        const db = getDatabase();

        // 1. Add is_deleted and deleted_at columns to relevant tables
        try {
            await db.prepare('ALTER TABLE inventory_materials ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE').run();
            await db.prepare('ALTER TABLE inventory_materials ADD COLUMN deleted_at INTEGER').run();
        } catch (e) {
            console.log('Columns may already exist in inventory_materials', e);
        }

        try {
            await db.prepare('ALTER TABLE inventory_history ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE').run();
            await db.prepare('ALTER TABLE inventory_history ADD COLUMN deleted_at INTEGER').run();
        } catch (e) {
            console.log('Columns may already exist in inventory_history', e);
        }

        try {
            await db.prepare('ALTER TABLE expenses ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE').run();
            await db.prepare('ALTER TABLE expenses ADD COLUMN deleted_at INTEGER').run();
        } catch (e) {
            console.log('Columns may already exist in expenses', e);
        }

        try {
            await db.prepare('ALTER TABLE vendor_payments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE').run();
            await db.prepare('ALTER TABLE vendor_payments ADD COLUMN deleted_at INTEGER').run();
        } catch (e) {
            console.log('Columns may already exist in vendor_payments', e);
        }

        // 2. Normalize existing categories
        await db.prepare(`UPDATE inventory_materials SET category = 'Fabric' WHERE LOWER(category) IN ('fabric', 'polyester', 'cotton', 'silk', 'viscose')`).run();
        await db.prepare(`UPDATE inventory_materials SET category = 'Ink' WHERE LOWER(category) IN ('ink', 'printing_ink')`).run();
        await db.prepare(`UPDATE inventory_materials SET category = 'Packaging' WHERE LOWER(category) = 'packaging'`).run();
        await db.prepare(`UPDATE inventory_materials SET category = 'Accessories' WHERE LOWER(category) = 'accessories'`).run();

        // 3. Remove orphan vendor_payments
        // Find vendor_payments starting with INV-PUR- or INV-PROC- that do not have a matching inventory_history
        await db.prepare(`
            DELETE FROM vendor_payments 
            WHERE (order_number LIKE 'INV-PUR-%' OR order_number LIKE 'INV-PROC-%') 
            AND order_number NOT IN (SELECT reason FROM inventory_history WHERE reason IS NOT NULL)
        `).run();

        // 4. Remove orphan expenses
        await db.prepare(`
            DELETE FROM expenses 
            WHERE (reference LIKE 'INV-PUR-%' OR reference LIKE 'INV-PROC-%') 
            AND reference NOT IN (SELECT reason FROM inventory_history WHERE reason IS NOT NULL)
        `).run();

        // Recalculating exact balances is deferred to the vendor API which computes dynamically.
        // We will just return success.
        return NextResponse.json({ success: true, message: 'Migration and cleanup completed successfully.' });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
