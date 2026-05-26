import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = getDatabase();
        
        // Return firms belonging to the user's workspace
        const workspaceId = payload.businessId;

        const firms = await db.prepare(`
            SELECT * FROM firms WHERE workspace_id = ? ORDER BY is_default DESC, created_at ASC
        `).all(workspaceId);

        return NextResponse.json(firms);
    } catch (error) {
        console.error('Firms fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
