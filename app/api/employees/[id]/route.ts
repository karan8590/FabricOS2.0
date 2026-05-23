import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { checkPermission } from '@/lib/auth/permissions';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { authorized, user: currentUser, error, status } = await checkPermission('employees.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const { name, phone, email, role, isActive, canLogin, password, monthlySalary } = await request.json();
        const db = getDatabase();

        // Check target user
        const targetUser = (await db.prepare('SELECT id, role FROM users WHERE id = ?').get(id)) as any;
        if (!targetUser) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        // Security Rules
        if (currentUser && currentUser.role === 'manager') {
            // Managers cannot modify Admins
            if (targetUser.role === 'admin') {
                return NextResponse.json(
                    { error: 'Managers cannot modify Admin accounts' },
                    { status: 403 }
                );
            }
            // Managers cannot promote to Admin
            if (role === 'admin') {
                return NextResponse.json(
                    { error: 'Managers cannot assign Admin role' },
                    { status: 403 }
                );
            }
            // Managers cannot change their own role/permissions?
            // Usually simpler: managers can't edit themselves via this API? 
            // Or maybe they can update profile, but not role.
            // Let's stick to "Managers cannot modify Admins". 
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (phone) { updates.push('phone = ?'); values.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (role) { updates.push('role = ?'); values.push(role); }
        if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
        if (canLogin !== undefined) { updates.push('can_login = ?'); values.push(canLogin ? 1 : 0); }
        if (monthlySalary !== undefined) { updates.push('monthly_salary = ?'); values.push(Number(monthlySalary)); }

        if (password) {
            const hashedPassword = await hashPassword(password);
            updates.push('password_hash = ?');
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return NextResponse.json({ message: 'No changes provided' });
        }

        values.push(id);

        const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
        stmt.run(...values);

        return NextResponse.json({ message: 'Employee updated successfully' });

    } catch (error) {
        console.error('Update employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { authorized, user: currentUser, error, status } = await checkPermission('employees.delete');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const db = getDatabase();
        const targetUser = (await db.prepare('SELECT role FROM users WHERE id = ?').get(id)) as any;

        if (!targetUser) return NextResponse.json({ message: 'Employee not found' }, { status: 404 });

        // Manager cannot delete Admin
        if (currentUser && currentUser.role === 'manager' && targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Managers cannot delete Admin accounts' }, { status: 403 });
        }

        // Cannot delete self
        if (currentUser && currentUser.userId === parseInt(id)) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        try {
            (await db.prepare('DELETE FROM users WHERE id = ?').run(id));
            return NextResponse.json({ message: 'Employee deleted successfully' });
        } catch (e: any) {
            if (e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                return NextResponse.json(
                    { error: 'Cannot delete employee with associated records. Disable them instead.' },
                    { status: 400 }
                );
            }
            throw e;
        }

    } catch (error) {
        console.error('Delete employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
