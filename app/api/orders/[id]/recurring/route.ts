import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const orderId = params.id;
        const { recurring_active } = await request.json();

        const db = getDatabase();

        const now = Math.floor(Date.now() / 1000);
        // Next due is 7 days from now
        const nextDue = now + 7 * 24 * 60 * 60;

        const stmt = db.prepare(`
            UPDATE orders 
            SET is_recurring = 1, 
                recurring_active = ?, 
                recurring_interval = 7, 
                recurring_next_due = CASE WHEN recurring_next_due IS NULL THEN ? ELSE recurring_next_due END
            WHERE id = ?
        `);
        
        stmt.run(recurring_active ? 1 : 0, nextDue, orderId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating recurring settings:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
