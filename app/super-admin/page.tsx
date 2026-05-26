'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import StatWidget from '@/components/ui/StatWidget';
import { Building2, Users, Receipt, TrendingUp, Shield, Settings, PlusCircle, XCircle } from 'lucide-react';
import styles from '@/app/dashboard/Dashboard.module.css';
import OnboardingModal from './OnboardingModal';

export default function SuperAdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for creating new business
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, bizRes] = await Promise.all([
                fetch('/api/super-admin/stats'),
                fetch('/api/super-admin/businesses')
            ]);
            
            if (statsRes.ok) setStats(await statsRes.json());
            if (bizRes.ok) setBusinesses(await bizRes.json());
        } catch (error) {
            console.error('Failed to fetch super admin data', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Redundant check, middleware/layout should handle this, but just in case
        if (user && !user.isSuperAdmin) {
            router.push('/');
            return;
        }
        
        fetchDashboardData();
    }, [user, router, fetchDashboardData]);

    if (loading) {
        return <div style={{ padding: '32px', color: '#64748b' }}>Loading Super Admin Panel...</div>;
    }

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Super Admin Panel</h1>
                    <p className={styles.subtitle}>Global Platform Control Center</p>
                </div>
                <div className={styles.headerRight}>
                    <button 
                        className={styles.syncBtn} 
                        onClick={() => setShowCreateModal(true)}
                        style={{ border: 'none', background: '#e0e7ff', color: '#4f46e5' }}
                    >
                        <PlusCircle size={16} /> Create Business
                    </button>
                </div>
            </div>

            <div className={styles.widgetRow}>
                <StatWidget 
                    title="Total Businesses" 
                    value={stats?.businesses?.value || 0}
                    icon={<Building2 size={24} />} 
                    trend={stats?.businesses?.change} 
                    trendLabel="vs last month"
                />
                <StatWidget 
                    title="Active Subscriptions" 
                    value={stats?.activePlans?.value || 0}
                    icon={<Shield size={24} />} 
                    trend={stats?.activePlans?.change}
                    trendLabel="vs last month"
                    trendUp={true} 
                />
                <StatWidget 
                    title="Total Users" 
                    value={stats?.totalUsers?.value || 0}
                    icon={<Users size={24} />} 
                    trend={stats?.totalUsers?.change}
                    trendLabel="vs last month"
                />
                <StatWidget 
                    title="Platform Revenue" 
                    value={`₹${stats?.platformRevenue?.value || 0}`}
                    icon={<TrendingUp size={24} />} 
                    trend={stats?.platformRevenue?.change}
                    trendLabel="vs last month"
                />
            </div>

            <div style={{ marginTop: '32px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <Building2 size={20} color="#4f46e5" />
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Registered Businesses</h2>
                </div>
                
                {businesses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Building2 size={48} />
                        <p>No businesses found</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {businesses.map((biz) => (
                            <div key={biz.id} className={styles.card} style={{ minHeight: 'auto', padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>{biz.name}</h3>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>Admin: {biz.adminName || '-'}</div>
                                    </div>
                                    <span className={`${styles.badge} ${biz.status === 'active' ? styles.badgeProduction : styles.badgeLow}`}>
                                        {biz.status}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '16px 0' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>Users</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{biz.userCount}</div>
                                    </div>
                                    <div style={{ width: '1px', backgroundColor: '#f1f5f9' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>Plan</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5' }}>{biz.plan || 'Starter'}</div>
                                    </div>
                                    <div style={{ width: '1px', backgroundColor: '#f1f5f9' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>Joined</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{new Date(biz.createdAt * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => router.push(`/super-admin/business/${biz.id}`)}
                                    style={{
                                        width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                                        color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 150ms'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0e7ff'; e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.color = '#4f46e5'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                                >
                                    <Settings size={16} /> Manage Business
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Premium Create Business Modal */}
            {showCreateModal && (
                <OnboardingModal 
                    onClose={() => setShowCreateModal(false)} 
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchDashboardData();
                    }}
                />
            )}
        </div>
    );
}
