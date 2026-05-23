'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import styles from './MainLayout.module.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Lazy load push notification permission requester after successful authentication
    useEffect(() => {
        if (user) {
            import('@/lib/firebase-push').then(({ requestPushPermissionAndGetToken }) => {
                requestPushPermissionAndGetToken();
            });
        }
    }, [user]);

    // Check and trigger daily outstanding vendor payments WhatsApp alerts for admin
    useEffect(() => {
        if (user && user.role === 'admin') {
            fetch('/api/vendor-payments/reminders', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.sentReminders > 0) {
                        console.log(`Dispatched ${data.sentReminders} pending WhatsApp reminders to administrator.`);
                    }
                })
                .catch(err => {
                    console.error('Trigger WhatsApp reminders error:', err);
                });
        }
    }, [user]);

    if (loading || !user) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#F8F9FB' }}>
                <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#6B7280', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg className="animate-spin" style={{ height: '32px', width: '32px', marginBottom: '16px', color: '#4F46E5', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{!loading && !user ? 'Redirecting to login...' : 'Loading FabricOS...'}</span>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.mainLayout}>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className={styles.content}>
                <header className={styles.header}>
                    <div className={styles.headerRight}>
                        <NotificationBell />
                    </div>
                </header>
                <button
                    className={styles.menuButton}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <main className={styles.main}>{children}</main>
            </div>
        </div>
    );
}
