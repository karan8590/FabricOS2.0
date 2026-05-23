'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CustomerWorkspace from './CustomerWorkspace';
import CustomerPortal from './CustomerPortal';
import styles from './CustomerWorkspace.module.css';

export default function CustomerPage() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchDashboardData();
        }
    }, [id]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/customers/${id}/workspace`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className={styles.loading}>Preparing workspace...</div>;
    }

    if (!data) {
        return <div className={styles.error}>Could not load customer data. Please try again.</div>;
    }

    // Role-based view switching
    if (user?.role === 'customer') {
        return <CustomerPortal data={data} />;
    }

    // Admins, Managers, and Staff see the Workspace (CRM) view
    return <CustomerWorkspace data={data} onUpdate={fetchDashboardData} />;
}
