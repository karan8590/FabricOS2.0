import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function checkPermission(permission: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
        return { authorized: false, error: 'Unauthorized', status: 401 };
    }

    const user = verifyToken(token);

    if (!user) {
        return { authorized: false, error: 'Invalid session', status: 401 };
    }

    try {
        const db = getDatabase();
        const freshPermissions = (await db
                    .prepare('SELECT permission_key FROM role_permissions WHERE role = ?')
                    .all(user.role))
            .map((p: any) => p.permission_key);

        if (!freshPermissions.includes(permission)) {
            return { authorized: false, error: 'Your account does not have access to this resource.', status: 403 };
        }
    } catch (dbErr) {
        // Fallback to token permissions in case DB is unavailable/locked
        if (!user.permissions || !user.permissions.includes(permission)) {
            return { authorized: false, error: 'Your account does not have access to this resource.', status: 403 };
        }
    }

    return { authorized: true, user };
}

export function unauthorizedResponse(message: string = 'Your account does not have access to this resource.') {
    return NextResponse.json({ error: message }, { status: 403 });
}
