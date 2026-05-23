import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });
        
        const businessId = user?.businessId;
        const body = await request.json();
        const db = getDatabase();

        if (body.inkConsumptionPerMetre) {
            await db.prepare(`
                INSERT INTO settings (business_id, key, value) 
                VALUES (?, 'ink_consumption_per_m', ?) 
                ON CONFLICT(key) DO UPDATE SET value = ?
            `).run(businessId, String(body.inkConsumptionPerMetre), String(body.inkConsumptionPerMetre));
        }

        if (body.reorderBufferPercent) {
            await db.prepare(`
                INSERT INTO settings (business_id, key, value) 
                VALUES (?, 'reorder_buffer_percent', ?) 
                ON CONFLICT(key) DO UPDATE SET value = ?
            `).run(businessId, String(body.reorderBufferPercent), String(body.reorderBufferPercent));
        }

        return NextResponse.json({ message: 'Inventory settings updated' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
