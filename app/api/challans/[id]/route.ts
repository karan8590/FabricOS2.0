import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const db = getDatabase();
        const rawChallan = (await db.prepare(`SELECT * FROM challans WHERE id = ? AND business_id = ?`).get(params.id, businessId)) as any;

        if (!rawChallan) {
            return NextResponse.json({ error: 'Challan not found' }, { status: 404 });
        }

        const challan = {
            ...rawChallan,
            items: rawChallan.items ? JSON.parse(rawChallan.items) : []
        };

        return NextResponse.json({ challan });
    } catch (error) {
        console.error('Challan fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const { authorized, user, error, status } = await checkPermission('orders.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const body = await request.json();
        const { action, received_quantity, closed_date, notes } = body;

        const db = getDatabase();
        
        if (action === 'close') {
            const today = new Date().toISOString().split('T')[0];
            const finalClosedDate = closed_date || today;

            (await db.prepare(`
                UPDATE challans 
                SET status = 'closed', closed_date = ?, closed_by = ?
                WHERE id = ? AND business_id = ?
            `).run(finalClosedDate, user?.name || 'System', params.id, businessId));

            return NextResponse.json({ success: true, message: 'Challan closed successfully' });
        }

        if (action === 'cancel') {
            (await db.prepare(`
                UPDATE challans 
                SET status = 'cancelled'
                WHERE id = ? AND business_id = ?
            `).run(params.id, businessId));

            return NextResponse.json({ success: true, message: 'Challan cancelled successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Challan update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
