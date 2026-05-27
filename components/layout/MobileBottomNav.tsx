'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    FileText, Truck, CalendarCheck, Receipt, MoreHorizontal
} from 'lucide-react';
import styles from './MobileBottomNav.module.css';
import { useAuth } from '@/contexts/AuthContext';

export interface MobileBottomNavProps {
    onMoreOpen: () => void;
    isMoreOpen: boolean;
}

const TABS = [
    { id: 'orders',      label: 'Orders',       icon: FileText,        href: '/orders' },
    { id: 'dispatch',    label: 'Dispatch',     icon: Truck,           href: '/dispatch-center' },
    { id: 'attendance',  label: 'Attendance',   icon: CalendarCheck,   href: '/employees?tab=attendance' },
    { id: 'invoices',    label: 'Invoices',     icon: Receipt,         href: '/invoices' },
    { id: 'more',        label: 'More',         icon: MoreHorizontal,  href: null },
] as const;

function isTabActive(tab: typeof TABS[number], pathname: string): boolean {
    if (!tab.href) return false;
    if (tab.href.includes('?')) return pathname === tab.href.split('?')[0];
    return pathname.startsWith(tab.href);
}

export default function MobileBottomNav({ onMoreOpen, isMoreOpen }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [overdueCount, setOverdueCount] = useState(0);

    // Fetch overdue count for Payments badge
    useEffect(() => {
        if (!user || user.role === 'customer') return;
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/vendor-payments/overdue-count');
                if (res.ok) {
                    const d = await res.json();
                    setOverdueCount(d.overdueCount || 0);
                }
            } catch { /* silent */ }
        };
        fetchCount();
        const t = setInterval(fetchCount, 15000);
        return () => clearInterval(t);
    }, [user]);

    const [isBulkMode, setIsBulkMode] = useState(false);

    useEffect(() => {
        const handleEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            setIsBulkMode(!!customEvent.detail?.active);
        };
        window.addEventListener('set-mobile-bulk-mode', handleEvent);
        return () => window.removeEventListener('set-mobile-bulk-mode', handleEvent);
    }, []);

    if (!user || user.role === 'customer' || user.isSuperAdmin) return null;

    const handleTab = (tab: typeof TABS[number]) => {
        if (tab.id === 'more') {
            onMoreOpen();
        } else if (tab.href) {
            router.push(tab.href);
        }
    };

    return (
        <nav className={`${styles.bottomNav} ${isBulkMode ? styles.bottomNavHidden : ''}`} role="navigation" aria-label="Main navigation">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.id === 'more' ? isMoreOpen : isTabActive(tab, pathname);

                return (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                        onClick={() => handleTab(tab)}
                        aria-label={tab.label}
                        aria-current={active && tab.id !== 'more' ? 'page' : undefined}
                    >
                        <span className={styles.tabIcon}>
                            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                            {tab.id === 'payments' && overdueCount > 0 && (
                                <span className={styles.badge}>
                                    {overdueCount > 99 ? '99+' : overdueCount}
                                </span>
                            )}
                        </span>
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
