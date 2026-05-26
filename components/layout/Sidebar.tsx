'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    ShoppingBag, 
    Receipt, 
    Users, 
    UserSquare2, 
    Box, 
    LogOut,
    HelpCircle,
    Wallet,
    Bell,
    Package,
    Banknote,
    Landmark,
    Settings as SettingsIcon,
    Send,
    FileText,
    Truck,
    Shield
} from 'lucide-react';
import styles from './Sidebar.module.css';
import FirmSwitcher from './FirmSwitcher';

// Rebuilt Sidebar with direct navigation and zero event interference
export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [overdueCount, setOverdueCount] = useState(0);

    useEffect(() => {
        if (!user || user.role === 'customer') return;

        const getCount = async () => {
            try {
                const res = await fetch('/api/vendor-payments/overdue-count');
                if (res.ok) {
                    const data = await res.json();
                    setOverdueCount(data.overdueCount || 0);
                }
            } catch (err) {
                console.error('Sidebar overdue count fetch error:', err);
            }
        };

        getCount();
        // Poll every 15 seconds to keep sidebar badge updated
        const timer = setInterval(getCount, 15000);
        return () => clearInterval(timer);
    }, [user]);

    if (!user) return null;

    const isCustomer = user.role === 'customer';
    
    let items = [];
    if (isCustomer) {
        items = [
            { label: 'Dashboard', href: `/customers/${user.customerId}`, icon: LayoutDashboard },
            { label: 'Catalog', href: `/customers/${user.customerId}/catalog`, icon: Box },
            { label: 'Orders', href: `/customers/${user.customerId}/orders`, icon: ShoppingBag },
            { label: 'Invoices', href: `/customers/${user.customerId}/invoices`, icon: Receipt },
            { label: 'Payments', href: `/customers/${user.customerId}/payments`, icon: Wallet },
            { label: 'Support', href: `/customers/${user.customerId}/support`, icon: HelpCircle },
        ];
    } else if (user.isSuperAdmin) {
        items = [
            { label: 'Super Admin', href: '/super-admin', icon: Shield },
        ];
    } else {
        items = [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Orders', href: '/orders', icon: ShoppingBag },
            { label: 'Dispatch Center', href: '/dispatch-center', icon: Truck },
            { label: 'Invoices', href: '/invoices', icon: Receipt },
            { label: 'Cash Book', href: '/expenses', icon: Wallet },
            { label: 'Vendor Payments', href: '/vendor-payments', icon: Landmark },
            { label: 'Customers', href: '/customers', icon: Users },
            { label: 'Inventory', href: '/inventory', icon: Package },
            { label: 'Employees', href: '/employees', icon: UserSquare2 },
            { label: 'Catalog', href: '/catalog', icon: Box },
            { label: 'GST Report', href: '/gst-report', icon: FileText },
            { label: 'Audit Log', href: '/audit-log', icon: Shield },
            { label: 'Settings', href: '/settings', icon: SettingsIcon },
            { label: 'Telegram Center', href: '/telegram-center', icon: Send },
        ];
    }

    return (
        <>
            {/* The Backdrop */}
            {isOpen && (
                <div 
                    className={styles.rebuiltOverlay} 
                    onClick={() => onClose?.()}
                />
            )}

            <aside 
                className={`${styles.rebuiltSidebar} ${isOpen ? styles.rebuiltOpen : ''}`}
            >
                {(!user || user.role === 'customer' || user.isSuperAdmin) ? (
                    <div className={styles.sidebarBrand}>
                         <div className={styles.logoBox}>
                             <Box size={24} color="#0071E3" />
                         </div>
                         <h1>FabricOS</h1>
                    </div>
                ) : (
                    <div style={{ paddingTop: '20px' }}>
                        <FirmSwitcher />
                    </div>
                )}

                <div className={styles.navWrapper}>
                    <nav className={styles.rebuiltNav}>
                        {items.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link 
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.rebuiltNavLink} ${isActive ? styles.rebuiltActive : ''}`}
                                    onClick={() => {
                                        if (window.innerWidth < 1024) onClose?.();
                                    }}
                                >
                                    <Icon size={18} className={styles.navIcon} />
                                    <span style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', gap: '8px' }}>
                                        {item.label}
                                        {item.label === 'Vendor Payments' && overdueCount > 0 && (
                                            <span style={{
                                                background: '#FF3B30',
                                                color: 'white',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                borderRadius: '99px',
                                                padding: '2px 6px',
                                                minWidth: '18px',
                                                textAlign: 'center',
                                                display: 'inline-block',
                                                lineHeight: '1'
                                            }}>
                                                {overdueCount}
                                            </span>
                                        )}
                                    </span>
                                    {isActive && <div className={styles.activeGlow} />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className={styles.sidebarBottom}>
                    <div className={styles.userCard}>
                        <div className={styles.userAvatar}>
                            {user.name.charAt(0)}
                        </div>
                        <div className={styles.userBrief}>
                            <strong>{user.name}</strong>
                            <span>{user.role}</span>
                        </div>
                    </div>
                    <div className={styles.logoutDivider} />
                    <button 
                        className={styles.rebuiltLogout}
                        onClick={() => {
                            logout();
                            window.location.href = '/login';
                        }}
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
