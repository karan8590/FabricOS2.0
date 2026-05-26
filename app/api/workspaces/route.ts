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
        
        // Return workspaces the user has access to.
        // For now, based on legacy business_id mapping:
        const workspaceId = payload.businessId;

        const workspaces = await db.prepare(`
            SELECT * FROM workspaces WHERE id = ?
        `).all(workspaceId);

        return NextResponse.json(workspaces);
    } catch (error) {
        console.error('Workspaces fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
