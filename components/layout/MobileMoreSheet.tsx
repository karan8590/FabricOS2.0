'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
    LayoutDashboard, IndianRupee, Users, Package, Grid, FileBarChart, 
    Search, ClipboardList, Settings, MessageCircle, ChevronRight, LogOut
} from 'lucide-react';
import styles from './MobileMoreSheet.module.css';
import { useAuth } from '@/contexts/AuthContext';

interface MobileMoreSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const MORE_ITEMS = [
    { label: 'Dashboard',       href: '/dashboard',         icon: LayoutDashboard },
    { label: 'Cash Book',       href: '/expenses',          icon: IndianRupee },
    { label: 'Vendor Payments', href: '/vendor-payments',   icon: IndianRupee },
    { label: 'Customers',       href: '/customers',         icon: Users },
    { label: 'Inventory',       href: '/inventory',         icon: Package },
    { label: 'Employees',       href: '/employees',         icon: Users },
    { label: 'Catalog',         href: '/catalog',           icon: Grid },
    { label: 'GST Report',      href: '/gst-report',        icon: FileBarChart },
    { label: 'Samples',         href: '/samples',           icon: Search },
    { label: 'Audit Log',       href: '/audit-log',         icon: ClipboardList },
    { label: 'Settings',        href: '/settings',          icon: Settings },
    { label: 'Telegram Center', href: '/telegram-center',   icon: MessageCircle },
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

                {/* Nav Rows */}
                <div className={styles.navContainer}>
                    {MORE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.href}
                                className={styles.drawerRow}
                                onClick={() => handleNav(item.href)}
                            >
                                <Icon size={20} color="#6B6560" />
                                <span className={styles.rowLabel}>{item.label}</span>
                                <ChevronRight size={18} color="#9C9490" className={styles.chevron} />
                            </div>
                        );
                    })}
                </div>

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
