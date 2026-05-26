'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, Receipt, TrendingUp, Shield, Settings, PlusCircle, XCircle, ArrowLeft, CheckCircle2, Key, Trash2, Pencil } from 'lucide-react';
import styles from '@/app/dashboard/Dashboard.module.css';

export default function BusinessDetailPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '' });
    
    // Add Admin modal
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdminForm, setNewAdminForm] = useState({ name: '', phone: '', password: '' });

    const [business, setBusiness] = useState<any>(null);
    
    // Passwords modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const bizRes = await fetch(`/api/super-admin/businesses/${params.id}`);
            if (bizRes.ok) {
                const data = await bizRes.json();
                setBusiness(data);
                setEditForm({ name: data.name });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleStatus = async () => {
        const res = await fetch(`/api/super-admin/businesses/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_status', status: business.status })
        });
        if (res.ok) fetchData();
    };

    const updateSetting = async (key: string, value: any) => {
        const res = await fetch(`/api/super-admin/businesses/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_setting', key, value })
        });
        if (res.ok) fetchData();
    };

    const updatePlan = async (plan: string) => {
        const res = await fetch(`/api/super-admin/businesses/${params.id}/subscription`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan })
        });
        if (res.ok) fetchData();
    };

    const resetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/super-admin/businesses/${params.id}/users`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_password', userId: selectedUser.id, newPassword })
        });
        if (res.ok) {
            setShowPasswordModal(false);
            setNewPassword('');
            console.log('Password reset successfully');
        }
    };

    const removeUser = async (userId: string) => {
        
        const res = await fetch(`/api/super-admin/businesses/${params.id}/users`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'delete' })
        });
        if (res.ok) fetchData();
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/super-admin/businesses/${params.id}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAdminForm)
            });
            if (res.ok) {
                setShowAddAdminModal(false);
                setNewAdminForm({ name: '', phone: '', password: '' });
                fetchData();
            } else {
                const data = await res.json();
                console.log(`Failed to add admin: ${data.error}`);
            }
        } catch (err) {
            console.error('Add admin error:', err);
            console.log('Failed to add admin');
        }
    };

    const handleUpdateDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/super-admin/businesses/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_details', name: editForm.name })
            });
            if (res.ok) {
                setShowEditModal(false);
                fetchData();
            } else {
                console.log('Failed to update business details');
            }
        } catch (err) {
            console.error('Update details error:', err);
            console.log('Failed to update business details');
        }
    };

    if (loading || !business) {
        return <div style={{ padding: '32px', color: '#64748b' }}>Loading...</div>;
    }

    const currentPlan = business.settings?.[`${business.id}_subscription_plan`] || 'Starter';

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button 
                        onClick={() => router.push('/super-admin')} 
                        style={{ 
                            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', 
                            fontWeight: 600, marginBottom: '8px', padding: 0 
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Businesses
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 className={styles.title}>{business.name}</h1>
                        <button 
                            onClick={() => setShowEditModal(true)}
                            style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Settings size={14} /> Edit
                        </button>
                        <button 
                            onClick={() => setShowAddAdminModal(true)}
                            style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <PlusCircle size={14} /> Add Admin
                        </button>
                    </div>
                    <p className={styles.subtitle}>ID: {business.id}</p>
                </div>
                <div className={styles.headerRight}>
                    <button 
                        onClick={toggleStatus}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: '1px solid',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
                            backgroundColor: business.status === 'active' ? '#fef2f2' : '#f0fdf4',
                            color: business.status === 'active' ? '#ef4444' : '#22c55e',
                            borderColor: business.status === 'active' ? '#fecaca' : '#bbf7d0'
                        }}
                    >
                        {business.status === 'active' ? 'Suspend Business' : 'Activate Business'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
                
                {/* LEFT COL: SUBSCRIPTIONS & PLATFORM CONTROLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Subscription Management */}
                    <div className={styles.card} style={{ minHeight: 'auto' }}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIconTitle}>
                                <Shield size={18} />
                                <h3>Subscription Plan</h3>
                            </div>
                        </div>
                        <div className={styles.cardContent}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {['Free', 'Starter', 'Pro'].map((plan) => (
                                    <div 
                                        key={plan}
                                        onClick={() => updatePlan(plan)}
                                        style={{
                                            padding: '16px', borderRadius: '12px', border: '1px solid', cursor: 'pointer', transition: 'all 150ms',
                                            borderColor: currentPlan === plan ? '#818cf8' : '#e2e8f0',
                                            backgroundColor: currentPlan === plan ? '#e0e7ff' : '#fff'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{plan} Plan</span>
                                            {currentPlan === plan && <CheckCircle2 size={18} color="#4f46e5" />}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {plan === 'Free' ? 'Max 5 users, basic features' : plan === 'Starter' ? 'Max 20 users, standard features' : 'Unlimited users, advanced features'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                </div>

                {/* RIGHT COL: ADMINS */}
                <div style={{ gridColumn: 'span 2' }}>
                    <div className={styles.card} style={{ minHeight: 'auto' }}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIconTitle}>
                                <Users size={18} />
                                <h3>Business Users</h3>
                            </div>
                        </div>
                        <div className={styles.cardContent}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className={styles.simpleTable}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Role</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {business.users?.map((u: any) => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 600 }}>{u.name}</td>
                                                <td>{u.phone}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeScheduled : u.role === 'disabled' ? styles.badgeLow : styles.badgeProduction}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }} 
                                                            style={{ padding: '6px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                            title="Reset Password"
                                                        >
                                                            <Key size={16} />
                                                        </button>
                                                        {u.role !== 'disabled' && (
                                                            <button 
                                                                onClick={() => removeUser(u.id)} 
                                                                style={{ padding: '6px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                                title="Remove User"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!business.users || business.users.length === 0) && (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No users found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Reset Modal */}
            {showPasswordModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Reset Password</h2>
                            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={resetPassword} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', marginTop: 0 }}>Set a new password for <strong>{selectedUser?.name}</strong>.</p>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '6px' }}>New Password</label>
                                <input 
                                    required 
                                    type="password" 
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                    placeholder="••••••••" 
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#475569', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#fff', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    Reset Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Business Modal */}
            {showEditModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Edit Business Details</h2>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateDetails} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '6px' }}>Business Name</label>
                                <input required type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} placeholder="Acme Textiles" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#475569', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#fff', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Add Admin Modal */}
            {showAddAdminModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Add New Admin</h2>
                            <button onClick={() => setShowAddAdminModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '6px' }}>Admin Name</label>
                                <input required type="text" value={newAdminForm.name} onChange={e => setNewAdminForm({...newAdminForm, name: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} placeholder="Admin Name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                                <input 
                                    required 
                                    type="tel" 
                                    pattern="\d{10}"
                                    maxLength={10}
                                    title="Please enter exactly 10 digits"
                                    value={newAdminForm.phone} 
                                    onChange={e => setNewAdminForm({...newAdminForm, phone: e.target.value.replace(/\D/g, '')})} 
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} 
                                    placeholder="9876543210" 
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '6px' }}>Password</label>
                                <input required type="password" value={newAdminForm.password} onChange={e => setNewAdminForm({...newAdminForm, password: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} placeholder="••••••••" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowAddAdminModal(false)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#475569', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#fff', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add Admin</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
