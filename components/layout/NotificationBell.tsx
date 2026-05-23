'use client';

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ShoppingBag, 
    AlertCircle, 
    DollarSign, 
    Briefcase, 
    CheckCircle2, 
    Bell, 
    X, 
    CheckSquare 
} from 'lucide-react';
import { 
    db, 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot 
} from '@/lib/firebase-mock';
import styles from './NotificationBell.module.css';

// Type mapping for premium accents and custom icons
const getIconConfig = (type: string) => {
    switch (type) {
        case 'invoice_overdue':
            return {
                icon: AlertCircle,
                bgColor: '#FEE2E2',
                color: '#DC2626'
            };
        case 'payment_received':
            return {
                icon: DollarSign,
                bgColor: '#DCFCE7',
                color: '#15803D'
            };
        case 'salary_pending':
            return {
                icon: Briefcase,
                bgColor: '#FEF3C7',
                color: '#D97706'
            };
        case 'order_completed':
            return {
                icon: CheckCircle2,
                bgColor: '#D1FAE5',
                color: '#10B981'
            };
        case 'new_order':
        case 'order_created':
        default:
            return {
                icon: ShoppingBag,
                bgColor: '#E0E7FF',
                color: '#4F46E5'
            };
    }
};

// Formats timestamp relativistically with high fidelity
const formatRelativeTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
        return 'just now';
    }
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins}m ago`;
    }
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }
    const days = Math.floor(diff / 86400000);
    if (days === 1) return 'yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Memoized Notification Item Component for performance optimization
const NotificationItem = memo(({ notification, onClick }: { notification: any; onClick: () => void }) => {
    const config = getIconConfig(notification.type);
    const Icon = config.icon;

    return (
        <div
            className={`${styles.item} ${!notification.isRead ? styles.itemUnread : ''}`}
            onClick={onClick}
        >
            <div 
                className={styles.iconContainer}
                style={{ backgroundColor: config.bgColor, color: config.color }}
            >
                <Icon size={20} />
            </div>

            <div className={styles.contentArea}>
                <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{notification.title}</span>
                    <span className={styles.time}>{formatRelativeTime(notification.createdAt)}</span>
                </div>
                <p className={styles.message}>{notification.message}</p>
            </div>

            {!notification.isRead && <div className={styles.unreadDot} />}
        </div>
    );
});

NotificationItem.displayName = 'NotificationItem';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    // 1. Establish Real-time Listener matching Firestore's onSnapshot API
    useEffect(() => {
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => doc.data());
            
            // 2. Real-time Browser Push Notifications trigger inside live query listener
            const now = Math.floor(Date.now() / 1000);
            fetched.forEach(n => {
                const isNew = (now - n.createdAt) <= 15; // Alert created within last 15 seconds
                
                if (isNew && !n.isRead) {
                    const clientKey = `push_alert_seen_${n.id}`;
                    
                    // Client-Side Duplication Check: only show browser notification once per alert id
                    if (!localStorage.getItem(clientKey)) {
                        localStorage.setItem(clientKey, 'true');
                        
                        // Dynamically import the browser push notification helper
                        import('@/lib/firebase-push').then(({ showLocalPushNotification }) => {
                            let clickUrl = '/';
                            if (n.type.includes('order')) {
                                clickUrl = '/orders';
                            } else if (n.type.includes('invoice') || n.type.includes('payment')) {
                                clickUrl = '/invoices';
                            } else if (n.type.includes('salary')) {
                                clickUrl = '/employees?tab=salary';
                            }

                            // Dispatch beautiful browser desktop push alert
                            showLocalPushNotification(n.title, n.message, clickUrl);
                        });
                    }
                }
            });

            setNotifications(fetched);
        });

        // 3. Return clean-up function to prevent memory leaks and redundant interval executions
        return () => unsubscribe();
    }, []);

    // Memoize the unreadCount to avoid extra recalculation cycles
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    // 4. Group Notifications into sticky periods inside useMemo
    const groupedNotifications = useMemo(() => {
        const today: any[] = [];
        const yesterday: any[] = [];
        const earlier: any[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);

        notifications.forEach(n => {
            const timeMs = n.createdAt * 1000;
            if (timeMs >= startOfToday) {
                today.push(n);
            } else if (timeMs >= startOfYesterday) {
                yesterday.push(n);
            } else {
                earlier.push(n);
            }
        });

        return { today, yesterday, earlier };
    }, [notifications]);

    const handleMarkAllRead = useCallback(async () => {
        try {
            // Optimistic client update for instant UX feedback
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            
            await fetch('/api/notifications', { method: 'PATCH' });
        } catch (e) {
            console.error('Mark all read error:', e);
        }
    }, []);

    const handleNotificationClick = useCallback(async (notification: any) => {
        if (!notification.isRead) {
            try {
                // Optimistic client update for instant UX feedback
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
                
                await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
            } catch (e) {
                console.error('Mark as read error:', e);
            }
        }

        // Deep linking navigation based on notification context
        if (notification.type.includes('order')) {
            router.push('/orders');
        } else if (notification.type.includes('invoice') || notification.type.includes('payment')) {
            router.push('/invoices');
        } else if (notification.type.includes('salary')) {
            router.push('/employees?tab=salary');
        }

        setIsOpen(false);
    }, [router]);

    return (
        <div className={styles.bellContainer}>
            {/* The Bell Button */}
            <button
                className={styles.bellButton}
                onClick={() => setIsOpen(true)}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Slide-over Backdrop Blur overlay */}
            {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

            {/* Slide-over Notification Panel */}
            <aside className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>Notifications</h2>
                        {unreadCount > 0 && (
                            <span className={styles.unreadCountBadge}>
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    
                    <div className={styles.headerRight}>
                        {unreadCount > 0 && (
                            <button 
                                className={styles.markAllRead} 
                                onClick={handleMarkAllRead}
                                title="Mark all as read"
                            >
                                Mark all read
                            </button>
                        )}
                        <button 
                            className={styles.closeButton} 
                            onClick={() => setIsOpen(false)}
                            aria-label="Close panel"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className={styles.list}>
                    {notifications.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIconContainer}>
                                <Bell size={24} />
                            </div>
                            <h3 className={styles.emptyTitle}>All caught up!</h3>
                            <p className={styles.emptyMessage}>
                                You will receive notifications here when new events occur.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Today Section */}
                            {groupedNotifications.today.length > 0 && (
                                <>
                                    <div className={styles.sectionHeader}>Today</div>
                                    {groupedNotifications.today.map(n => (
                                        <NotificationItem
                                            key={n.id}
                                            notification={n}
                                            onClick={() => handleNotificationClick(n)}
                                        />
                                    ))}
                                </>
                            )}

                            {/* Yesterday Section */}
                            {groupedNotifications.yesterday.length > 0 && (
                                <>
                                    <div className={styles.sectionHeader}>Yesterday</div>
                                    {groupedNotifications.yesterday.map(n => (
                                        <NotificationItem
                                            key={n.id}
                                            notification={n}
                                            onClick={() => handleNotificationClick(n)}
                                        />
                                    ))}
                                </>
                            )}

                            {/* Earlier Section */}
                            {groupedNotifications.earlier.length > 0 && (
                                <>
                                    <div className={styles.sectionHeader}>Earlier</div>
                                    {groupedNotifications.earlier.map(n => (
                                        <NotificationItem
                                            key={n.id}
                                            notification={n}
                                            onClick={() => handleNotificationClick(n)}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </div>
    );
}
