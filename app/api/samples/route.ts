import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';

export async function GET(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('orders.view'); // Use orders.view as a proxy for samples or standard read
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = user?.businessId;
        const db = getDatabase();

        const samples = await db.prepare(`
            SELECT * FROM samples WHERE business_id = ? ORDER BY date DESC, id DESC
        `).all(businessId);

        return NextResponse.json({ samples });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = user?.businessId;
        const body = await request.json();
        const db = getDatabase();

        const { date, party_name, design_name, courier_name, awb_number, cost, status: sampleStatus } = body;

        const result = (await db.prepare(`
            INSERT INTO samples (business_id, date, party_name, design_name, courier_name, awb_number, cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `).get(businessId, date, party_name, design_name, courier_name, awb_number || null, cost, sampleStatus)) as { id: number };

        return NextResponse.json({ message: 'Sample created successfully', id: result.id }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = user?.businessId;
        const body = await request.json();
        const db = getDatabase();

        const { id, status: sampleStatus } = body;

        await db.prepare(`
            UPDATE samples SET status = ? WHERE id = ? AND business_id = ?
        `).run(sampleStatus, id, businessId);

        return NextResponse.json({ message: 'Sample updated successfully' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
