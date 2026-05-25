import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { hashPassword } from '@/lib/auth/password';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = getDatabase();
        
        // Fetch businesses with admin counts and subscription plans
        const businesses = (await db.prepare(`
            SELECT 
                b.id,
                b.name,
                b.status,
                b.created_at as createdAt,
                (SELECT COUNT(*) FROM users u WHERE u.business_id = b.id) as userCount,
                (SELECT value FROM settings s WHERE s.business_id = b.id AND s.key = 'subscription_plan') as plan,
                (SELECT name FROM users u2 WHERE u2.business_id = b.id AND u2.role = 'admin' LIMIT 1) as adminName
            FROM businesses b
            ORDER BY b.created_at DESC
        `).all());

        return NextResponse.json(businesses);

    } catch (error) {
        console.error('Super admin businesses fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = cookies().get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { name, gstin, adminName, phone, password, plan, address, logoUrl } = body;

        if (!name || !adminName || !phone || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        
        // Proper bcrypt hash for the new user's password
        const passwordHash = await hashPassword(password);
        
        // Generate business ID
        const businessId = 'business_' + Date.now().toString().slice(-6);

        // Transaction for new business + admin user + settings
        const transaction = db.transaction(async () => {
            // 1. Create Business
            (await db.prepare(`
                INSERT INTO businesses (id, name, type, status, phone, gst_number, address, logo_url, created_at)
                VALUES (?, ?, 'Textile Manufacturer', 'active', ?, ?, ?, ?, (EXTRACT(EPOCH FROM NOW()))::integer)
            `).run(businessId, name, phone, gstin || null, address || null, logoUrl || null));

            // 2. Create Admin User
            // Create initial admin user
            const finalPhone = phone.startsWith('+') ? phone : '+91' + phone;
            (await db.prepare(`
                INSERT INTO users (name, phone, password_hash, role, business_id, created_at)
                VALUES (?, ?, ?, 'admin', ?, (EXTRACT(EPOCH FROM NOW()))::integer)
            `).run(adminName, finalPhone, passwordHash, businessId));

            // Update owner_uid of business (getting last inserted row id)
            const userResult = (await db.prepare('SELECT id FROM users WHERE phone = ?').get(finalPhone)) as any;
            if (userResult) {
                (await db.prepare('UPDATE businesses SET owner_uid = ? WHERE id = ?')
                                    .run(userResult.id, businessId));
            }

            // 3. Insert Subscription Setting
            (await db.prepare(`
                INSERT INTO settings (key, value, business_id)
                VALUES (?, ?, ?)
            `).run('subscription_plan', plan || 'Starter', businessId));
            
        });

        await transaction();

        return NextResponse.json({ success: true, businessId });

    } catch (error) {
        console.error('Super admin business create error:', error);
        return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
    }
}
