import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(null, { status: 401 });
        }

        const payload = verifyToken(token);

        if (!payload) {
            return NextResponse.json(null, { status: 401 });
        }

        return NextResponse.json({
            id: payload.userId,
            phone: payload.phone,
            name: payload.name,
            role: payload.role,
            permissions: payload.permissions,
            customerId: payload.customerId,
            businessId: payload.businessId,
            isSuperAdmin: payload.isSuperAdmin || false,
        });
    } catch (error) {
        return NextResponse.json(null, { status: 401 });
    }
}
