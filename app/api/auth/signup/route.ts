import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { name, phone, password } = await request.json();

        if (!name || !phone || !password) {
            return NextResponse.json(
                { error: 'Name, phone, and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Check if user already exists
        const existingUser = (await db
                    .prepare('SELECT id FROM users WHERE phone = ?')
                    .get(phone));

        if (existingUser) {
            return NextResponse.json(
                { error: 'Phone number already registered' },
                { status: 400 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user account
        const userResult = (await db
                    .prepare(
                        "INSERT INTO users (phone, password_hash, name, role) VALUES (?, ?, ?, 'customer')"
                    )
                    .run(phone, passwordHash, name));

        const userId = userResult.lastInsertRowid as number;

        // Create customer record
        const customerResult = (await db.prepare(
                    'INSERT INTO customers (user_id, name, phone, outstanding_amount, total_orders) VALUES (?, ?, ?, 0, 0)'
                ).run(userId, name, phone));
        
        const customerId = customerResult.lastInsertRowid as number;

        // Generate JWT token
        const token = generateToken({
            userId,
            phone,
            role: 'customer',
            permissions: ['catalog.view', 'orders.view', 'invoices.view'], // Basic customer permissions
            name,
            customerId,
        });

        // Set cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: userId,
                phone,
                name,
                role: 'customer',
                customerId,
            },
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
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Registration failed. Please try again.' },
            { status: 500 }
        );
    }
}
