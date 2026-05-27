import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
        }

        const res = await query(
            'SELECT * FROM invoice_history WHERE invoice_id = $1 ORDER BY created_at ASC',
            [id]
        );

        return NextResponse.json({ history: res.rows }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch invoice history:', error);
        return NextResponse.json({ error: 'Failed to fetch invoice history' }, { status: 500 });
    }
}
