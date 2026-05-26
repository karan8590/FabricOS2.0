'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
    Users, Package, Receipt, UserSquare2, Box,
    FileText, Shield, Settings, Send, LogOut, Landmark
} from 'lucide-react';
import styles from './MobileMoreSheet.module.css';
import { useAuth } from '@/contexts/AuthContext';

interface MobileMoreSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const MORE_ITEMS = [
    { label: 'Customers',  href: '/customers',       icon: Users,       color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Invoices',   href: '/invoices',         icon: Receipt,     color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Inventory',  href: '/inventory',        icon: Package,     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Employees',  href: '/employees',        icon: UserSquare2, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Catalog',    href: '/catalog',          icon: Box,         color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
    { label: 'Cash Book',  href: '/expenses',         icon: Landmark,    color: '#14B8A6', bg: 'rgba(20,184,166,0.1)' },
    { label: 'GST Report', href: '/gst-report',       icon: FileText,    color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Audit Log',  href: '/audit-log',        icon: Shield,      color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
    { label: 'Settings',   href: '/settings',         icon: Settings,    color: '#78716C', bg: 'rgba(120,113,108,0.1)' },
    { label: 'Telegram',   href: '/telegram-center',  icon: Send,        color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
];

export default function MobileMoreSheet({ isOpen, onClose }: MobileMoreSheetProps) {
    const router = useRouter();
    const { user, logout } = useAuth();

    if (!isOpen || !user) return null;

    const handleNav = (href: string) => {
        onClose();
        router.push(href);
    };

    const handleLogout = () => {
        onClose();
        logout();
        window.location.href = '/login';
    };

    const avatarLetter = (user.name || 'U').trim()[0].toUpperCase();

    return createPortal(
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="More navigation">
                <div className={styles.handle} />

                {/* User info */}
                <div className={styles.userSection}>
                    <div className={styles.avatar}>{avatarLetter}</div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userRole}>{user.role}</div>
                    </div>
                </div>

                {/* Nav grid */}
                <div className={styles.navGrid}>
                    {MORE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.href}
                                className={styles.navItem}
                                onClick={() => handleNav(item.href)}
                            >
                                <div
                                    className={styles.navItemIcon}
                                    style={{ background: item.bg, color: item.color }}
                                >
                                    <Icon size={22} color={item.color} strokeWidth={1.8} />
                                </div>
                                <span className={styles.navItemLabel}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={styles.divider} />

                {/* Logout */}
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    <LogOut size={18} />
                    Log Out
                </button>
            </div>
        </>,
        document.body
    );
}
