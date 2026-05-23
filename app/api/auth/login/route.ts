import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';

export async function POST(request: Request) {
    try {
        const { phone, email, password } = await request.json();
        const loginId = phone || email; // Support both

        if (!loginId || !password) {
            return NextResponse.json(
                { error: 'Phone/Email and password are required' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // 1. Check if user is Super Admin
        const superAdmin = (await db.prepare('SELECT * FROM super_admins WHERE email = ? OR email LIKE ?').get(loginId, `%${loginId}`)) as any;
        if (superAdmin) {
            const isValidPassword = await verifyPassword(password, superAdmin.password_hash);
            if (!isValidPassword) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            const token = generateToken({
                userId: superAdmin.id,
                phone: loginId, // placeholder
                role: 'admin', // Super Admin acts as root admin
                permissions: [],
                name: superAdmin.name,
                businessId: 'super_admin',
                isSuperAdmin: true
            });

            const response = NextResponse.json({
                id: superAdmin.id,
                name: superAdmin.name,
                isSuperAdmin: true,
                businessId: 'super_admin'
            });

            response.cookies.set('auth-token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return response;
        }

        // 2. Regular User Login
        const user = (await db
                    .prepare('SELECT * FROM users WHERE phone = ? OR email = ? OR phone LIKE ?')
                    .get(loginId, loginId, `%${loginId}`)) as any;

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Check if account is active and allowed to login
        // Note: Admin accounts might be exempt from self-lockout via this check if intended, 
        // but requirement says "If blocked: Show error". Strict checking.
        if (user.is_active === 0 || user.can_login === 0) {
            return NextResponse.json(
                { error: 'Your access has been restricted. Contact administrator.' },
                { status: 403 }
            );
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);

        if (!isValidPassword) {
            return NextResponse.json({ error: 'TRACE: regular user invalid password' }, { status: 401 });
        }

        // Fetch permissions
        const permissions = (await db.prepare('SELECT permission_key FROM role_permissions WHERE role = ?').all(user.role)).map((p: any) => p.permission_key);

        // If customer, get customer ID
        let customerId = null;
        if (user.role === 'customer') {
            const customer = (await db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id)) as any;
            customerId = customer?.id;
        }

        // Check if the business is active
        const business = (await db.prepare('SELECT status FROM businesses WHERE id = ?').get(user.business_id)) as any;
        if (business && business.status === 'suspended') {
            return NextResponse.json(
                { error: 'Your business account has been suspended by the administrator.' },
                { status: 403 }
            );
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            phone: user.phone,
            role: user.role,
            permissions,
            name: user.name,
            customerId,
            businessId: user.business_id,
            isSuperAdmin: false
        });

        // Set httpOnly cookie
        const response = NextResponse.json({
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            permissions: permissions,
            customerId,
            businessId: user.business_id,
            isSuperAdmin: false
        });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
