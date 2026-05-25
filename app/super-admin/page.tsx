'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import StatWidget from '@/components/ui/StatWidget';
import { Building2, Users, Receipt, TrendingUp, Shield, Settings, PlusCircle, XCircle } from 'lucide-react';
import styles from '@/app/dashboard/Dashboard.module.css';

export default function SuperAdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for creating new business
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBusiness, setNewBusiness] = useState({
        name: '',
        gstin: '',
        adminName: '',
        phone: '',
        password: '',
        plan: 'Starter',
        address: '',
        logoUrl: ''
    });

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

    const handleCreateBusiness = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/super-admin/businesses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBusiness)
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewBusiness({ name: '', gstin: '', adminName: '', phone: '', password: '', plan: 'Starter', address: '', logoUrl: '' });
                fetchDashboardData(); // Refresh list
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Failed to create business');
        }
    };

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
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '32px 32px 24px 32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)' }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Create New Business</h2>
                                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Set up a new textile business workspace for your team.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleCreateBusiness} style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                
                                {/* Section 1: Business Information */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>1. Business Information</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Business Name *</label>
                                            <input required type="text" value={newBusiness.name} onChange={e => setNewBusiness({...newBusiness, name: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="e.g. Royal Heritage Fabrics" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>GSTIN (Optional)</label>
                                            <input type="text" value={newBusiness.gstin} onChange={e => setNewBusiness({...newBusiness, gstin: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="22AAAAA0000A1Z5" />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Business Address *</label>
                                            <input required type="text" value={newBusiness.address} onChange={e => setNewBusiness({...newBusiness, address: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="Plot No. 45-48, Sachin GIDC, Surat, Gujarat" />
                                        </div>
                                        
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Business Logo (Optional)</label>
                                            <label style={{ 
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', backgroundColor: '#f8fafc',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }} onMouseOver={e => e.currentTarget.style.borderColor = '#4f46e5'} onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                                
                                                {newBusiness.logoUrl ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                        <img src={newBusiness.logoUrl} alt="Logo Preview" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                                                        <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 500 }}>Change image</span>
                                                    </div>
                                                ) : (
                                                    <div style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#64748b' }}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                        </div>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Click to upload or drag & drop</p>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>PNG, JPG, GIF up to 2MB</p>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setNewBusiness({...newBusiness, logoUrl: reader.result as string});
                                                            };
                                                            reader.readAsDataURL(file);
                                                        } else {
                                                            setNewBusiness({...newBusiness, logoUrl: ''});
                                                        }
                                                    }} 
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%' }}></div>

                                {/* Section 2: Admin Account */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>2. Admin Account</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Admin Name *</label>
                                            <input required type="text" value={newBusiness.adminName} onChange={e => setNewBusiness({...newBusiness, adminName: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="e.g. Karan Dhameliya" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Phone Number *</label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '15px', fontWeight: 500 }}>+91</div>
                                                <input 
                                                    required 
                                                    type="tel" 
                                                    pattern="\d{10}"
                                                    maxLength={10}
                                                    title="Please enter exactly 10 digits"
                                                    value={newBusiness.phone} 
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setNewBusiness({...newBusiness, phone: val});
                                                    }} 
                                                    style={{ width: '100%', padding: '12px 16px 12px 48px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} 
                                                    onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                    placeholder="9876543210" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Initial Password *</label>
                                            <input required type="password" value={newBusiness.password} onChange={e => setNewBusiness({...newBusiness, password: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="••••••••" />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%' }}></div>

                                {/* Section 3: Subscription & Settings */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>3. Settings</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Subscription Plan</label>
                                            <div style={{ position: 'relative' }}>
                                                <select value={newBusiness.plan} onChange={e => setNewBusiness({...newBusiness, plan: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundColor: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                                    <option value="Free">Free Tier</option>
                                                    <option value="Starter">Starter Plan</option>
                                                    <option value="Pro">Pro Plan</option>
                                                </select>
                                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '24px 32px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 600, color: '#475569', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: '#fff', backgroundColor: '#4f46e5', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -2px rgba(79, 70, 229, 0.2)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#4338ca'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#4f46e5'}>
                                    Create Business
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}        </div>
    );
}
