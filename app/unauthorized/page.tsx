'use client';

import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#000',
            color: '#fff',
            gap: '20px'
        }}>
            <h1 style={{ fontSize: '24px', fontWeight: '500' }}>Access Restricted</h1>
            <p style={{ color: '#888' }}>You do not have permission to view this page.</p>
            <Button variant="secondary" onClick={() => router.back()}>
                Go Back
            </Button>
            <Button variant="ghost" onClick={() => router.push('/login')}>
                Back to Login
            </Button>
        </div>
    );
}
