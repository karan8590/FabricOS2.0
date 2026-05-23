'use client';

import { useAuth } from '@/contexts/AuthContext';

export function usePermission() {
    const { user } = useAuth();

    const can = (permission: string) => {
        if (!user || !user.permissions) return false;
        // Admin override safe check (though backend handles truth)
        if (user.role === 'admin') return true;
        return user.permissions.includes(permission);
    };

    return { can };
}
