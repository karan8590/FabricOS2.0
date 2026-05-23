import { cookies, headers } from 'next/headers';
import { verifyToken } from './jwt';

export async function getActiveBusinessId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Check for Super Admin override in headers
    if (payload.isSuperAdmin) {
        const headersList = await headers();
        const overrideBusinessId = headersList.get('X-Business-ID');
        if (overrideBusinessId) {
            return overrideBusinessId;
        }
        // If super admin doesn't provide override, return 'super_admin' or their base
        return payload.businessId || 'super_admin';
    }

    // Backward compatibility: tokens generated before multi-tenant update
    // default to business_001
    return payload.businessId || 'business_001';
}
