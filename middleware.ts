import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Route -> Permission mapping
const routePermissions: Record<string, string> = {
    '/orders': 'orders.view',
    '/invoices': 'invoices.view',
    '/customers': 'customers.view',
    '/inventory': 'inventory.view',
    '/employees': 'employees.view',
    '/expenses': 'expenses.view',
    '/vendors': 'vendors.view',
    '/catalog': 'catalog.view',
};

// Paths that don't require auth
const publicPaths = ['/login', '/api/auth/login', '/_next', '/favicon.ico', '/public'];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. Skip public paths
    if (publicPaths.some(p => path.startsWith(p))) {
        return NextResponse.next();
    }

    // 2. Check for token
    const tokenCookie = request.cookies.get('auth-token');
    const token = tokenCookie?.value;

    if (!token) {
        // Redirect to login if accessing protected route
        // But allow /api to pass? (API usually returns 401 JSON, not redirect HTML)
        if (path.startsWith('/api')) {
            // API routes handle their own 401
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        // 3. Verify Token
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        // 4. Role/Permission Check
        // If Admin, bypass
        if (payload.role === 'admin') {
            return NextResponse.next();
        }

        // Check specific route permissions
        const matchingRoute = Object.keys(routePermissions).find(route => path.startsWith(route));
        const requiredPermission = matchingRoute ? routePermissions[matchingRoute] : null;

        if (requiredPermission) {
            // SPECIAL CASE: Allow customers to see THEIR OWN customer portal pages
            if (payload.role === 'customer' && path.startsWith('/customers/')) {
                const parts = path.split('/');
                const urlId = parts[2];
                // Compare as strings to avoid type mismatches from different JWT libraries
                if (urlId && String(urlId) === String(payload.customerId)) {
                    return NextResponse.next();
                }
            }

            const userPermissions = (payload.permissions as string[]) || [];
            if (!userPermissions.includes(requiredPermission)) {
                // If they are a customer trying to access an admin page, send to their own dashboard
                const targetUrl = `/customers/${payload.customerId}`;
                if (payload.role === 'customer' && payload.customerId && path !== targetUrl) {
                    return NextResponse.redirect(new URL(targetUrl, request.url));
                }
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }

        return NextResponse.next();

    } catch (err) {
        console.error('Middleware Auth Error:', err);
        // Invalid token
        if (path.startsWith('/api')) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
