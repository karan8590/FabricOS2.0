import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
// import { verifyToken } from '@/lib/auth/jwt'; // This import is no longer needed

export async function GET() {
    try {
        const { authorized, error, status, user } = await checkPermission('employees.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId;

        const db = getDatabase();
        const employees = (await db.prepare(`
            SELECT id, name, phone, email, role, is_active, can_login, monthly_salary as monthlySalary, last_login, created_at 
            FROM users 
            WHERE role != 'customer' AND business_id = ?
            ORDER BY created_at DESC
        `).all(businessId));

        return NextResponse.json({ employees });
    } catch (error) {
        console.error('Failed to fetch employees:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { checkPermission, unauthorizedResponse } from '@/lib/auth/permissions';

export async function POST(request: Request) {
    try {
        const { authorized, user: currentUser, error, status } = await checkPermission('employees.create');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = currentUser?.businessId;

        const { name, phone, email, role, password, isActive, canLogin, monthlySalary } = await request.json();

        // Validation
        if (!name || !phone || !role) {
            return NextResponse.json(
                { error: 'Name, phone, and role are required' },
                { status: 400 }
            );
        }

        // Dynamic password generation if not provided? Prompt says "Password field OR Auto-generate".
        // UI should handle generation and send it. If empty here, we error for now.
        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            );
        }

        if (!['admin', 'manager', 'staff'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            );
        }

        // Manager Permission Check
        if (currentUser && currentUser.role === 'manager' && role === 'admin') {
            return NextResponse.json(
                { error: 'Managers cannot create Admin accounts' },
                { status: 403 }
            );
        }

        const db = getDatabase();

        // Check availability
        const existing = (await db.prepare('SELECT id FROM users WHERE phone = ? AND business_id = ?').get(phone, businessId));
        if (existing) {
            return NextResponse.json(
                { error: 'Phone number already registered' },
                { status: 409 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const stmt = db.prepare(`
            INSERT INTO users (business_id, name, phone, email, role, password_hash, is_active, can_login, monthly_salary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Defaults
        const activeVal = isActive === undefined ? 1 : (isActive ? 1 : 0);
        const loginVal = canLogin === undefined ? 1 : (canLogin ? 1 : 0);
        const salaryVal = monthlySalary === undefined ? 0 : Number(monthlySalary);

        const result = stmt.run(businessId, name, phone, email || null, role, hashedPassword, activeVal, loginVal, salaryVal);

        return NextResponse.json({
            id: result.lastInsertRowid,
            message: 'Employee created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Create employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const { authorized, user: currentUser, error, status } = await checkPermission('employees.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = currentUser?.businessId;

        const { id, name, phone, email, role, password, isActive, canLogin, monthlySalary } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const db = getDatabase();

        // Check if user exists
        const targetUser = (await db.prepare('SELECT * FROM users WHERE id = ? AND business_id = ?').get(id, businessId)) as any;
        if (!targetUser) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Security Checks
        // 1. Manager cannot edit Admin
        if (currentUser && currentUser.role === 'manager' && targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Managers cannot edit Admin accounts' }, { status: 403 });
        }

        // 2. Prevent removing last Admin
        if (targetUser.role === 'admin' && role !== 'admin') {
            const adminCount = (await db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin' AND is_active = 1 AND business_id = ?").get(businessId)) as any;
            if (adminCount.count <= 1) {
                return NextResponse.json({ error: 'Cannot remove the last Admin' }, { status: 400 });
            }
        }

        // 3. Prevent Self-Lockout (optional but safe)
        // If editing self, ensure canLogin and isActive remain true?
        // Using userId as per JWTPayload definition
        if (currentUser && currentUser.userId === id) {
            if (isActive === false || canLogin === false) {
                return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 });
            }
        }

        let passwordHash = targetUser.password_hash;
        if (password) {
            passwordHash = await hashPassword(password);
        }

        const activeVal = isActive === undefined ? (targetUser.is_active ? 1 : 0) : (isActive ? 1 : 0);
        const loginVal = canLogin === undefined ? (targetUser.can_login ? 1 : 0) : (canLogin ? 1 : 0);
        const salaryVal = monthlySalary === undefined ? (targetUser.monthly_salary ?? 0) : Number(monthlySalary);

        const stmt = db.prepare(`
            UPDATE users 
            SET name = ?, phone = ?, email = ?, role = ?, password_hash = ?, is_active = ?, can_login = ?, monthly_salary = ?
            WHERE id = ? AND business_id = ?
        `);

        stmt.run(name, phone, email || null, role, passwordHash, activeVal, loginVal, salaryVal, id, businessId);

        return NextResponse.json({ message: 'Employee updated successfully' });

    } catch (error) {
        console.error('Update employee error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
