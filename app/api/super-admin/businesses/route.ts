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
        const { name, gstin, adminName, phone, password, plan, address, logoUrl, structure, firms } = body;

        if (!name || !adminName || !phone || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        
        // Proper bcrypt hash for the new user's password
        const passwordHash = await hashPassword(password);
        
        // Generate business ID (which now acts as Workspace ID too)
        const businessId = 'business_' + Date.now().toString().slice(-6);

        // Transaction for new business + admin user + settings
        const transaction = db.transaction(async () => {
            const now = Math.floor(Date.now() / 1000);
            
            // 1. Create Business (Root Tenant isolation)
            (await db.prepare(`
                INSERT INTO businesses (id, name, type, status, phone, gst_number, address, logo_url, created_at)
                VALUES (?, ?, 'Textile Manufacturer', 'active', ?, ?, ?, ?, ?)
            `).run(businessId, name, phone, gstin || null, address || null, logoUrl || null, now));

            // 1a. Create Workspace (New schema)
            (await db.prepare(`
                INSERT INTO workspaces (id, workspace_name, logo_url, phone, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(businessId, name, logoUrl || null, phone || null, now));

            // 1b. Create Firms
            if (structure === 'single') {
                (await db.prepare(`
                    INSERT INTO firms (
                        workspace_id, firm_name, gst_number, phone, address, logo_url, is_default, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, true, ?)
                `).run(businessId, name, gstin || null, phone || null, address || null, logoUrl || null, now));
            } else if (structure === 'multi' && firms && firms.length > 0) {
                let isFirst = true;
                for (const firm of firms) {
                    (await db.prepare(`
                        INSERT INTO firms (
                            workspace_id, firm_name, gst_number, phone, email, address, logo_url, is_default, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        businessId, 
                        firm.name, 
                        firm.gstin || null, 
                        firm.phone || null, 
                        firm.email || null, 
                        firm.address || null, 
                        firm.logoUrl || null, 
                        isFirst,
                        now
                    ));
                    isFirst = false;
                }
            }

            // 2. Create Admin User
            // Create initial admin user
            const finalPhone = phone.startsWith('+') ? phone : '+91' + phone;
            (await db.prepare(`
                INSERT INTO users (name, phone, password_hash, role, business_id, created_at)
                VALUES (?, ?, ?, 'admin', ?, ?)
            `).run(adminName, finalPhone, passwordHash, businessId, now));

            // Update owner_uid of business (getting last inserted row id)
            const userResult = (await db.prepare('SELECT id FROM users WHERE phone = ?').get(finalPhone)) as any;
            if (userResult) {
                (await db.prepare('UPDATE businesses SET owner_uid = ? WHERE id = ?')
                                    .run(userResult.id, businessId));
                (await db.prepare('UPDATE workspaces SET owner_name = ? WHERE id = ?')
                                    .run(adminName, businessId));
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
