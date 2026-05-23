'use client';

import { usePermission } from '@/hooks/usePermission';

interface CanProps {
    permission: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function Can({ permission, children, fallback = null }: CanProps) {
    const { can } = usePermission();

    if (can(permission)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
