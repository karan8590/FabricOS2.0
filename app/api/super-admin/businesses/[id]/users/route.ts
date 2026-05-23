import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { userId, action, newPassword } = body;

        if (!userId || !action) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

        const db = getDatabase();

        if (action === 'reset_password') {
            if (!newPassword) return NextResponse.json({ error: 'New password required' }, { status: 400 });
            const { hashPassword } = await import('@/lib/auth/password');
            const passwordHash = await hashPassword(newPassword);
            (await db.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND business_id = ?').run(passwordHash, userId, params.id));
            return NextResponse.json({ success: true });
        }

        if (action === 'delete') {
            (await db.prepare('DELETE FROM users WHERE id = ? AND business_id = ?').run(userId, params.id));
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Super admin user update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { name, phone, password } = body;

        if (!name || !phone || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        
        // Dynamic import to avoid edge runtime issues if hashPassword uses node modules
        const { hashPassword } = await import('@/lib/auth/password');
        const passwordHash = await hashPassword(password);
        
        const finalPhone = phone.startsWith('+') ? phone : '+91' + phone;
        
        (await db.prepare(`
            INSERT INTO users (name, phone, password_hash, role, business_id, created_at)
            VALUES (?, ?, ?, 'admin', ?, unixepoch())
        `).run(name, finalPhone, passwordHash, params.id));
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Super admin add user error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
