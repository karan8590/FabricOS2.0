'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
    ShoppingBag, CreditCard, 
    Activity, CheckCircle2, 
    MessageCircle, ShoppingCart
} from 'lucide-react';
import Button from '@/components/ui/Button';
import StatWidget from '@/components/ui/StatWidget';
import styles from './CustomerPortal.module.css';

interface CustomerPortalProps {
    data: any;
}

export default function CustomerPortal({ data }: CustomerPortalProps) {
    const router = useRouter();
    const { customer, metrics, orders, activity } = data;

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const activeOrdersCount = orders.filter((o: any) => !['completed', 'cancelled'].includes(o.status.toLowerCase())).length;
    const inProductionCount = orders.filter((o: any) => o.status.toLowerCase() === 'in-production').length;

    return (
        <div className={styles.portalPage}>
            <header className={styles.pageHeader}>
                <div className={styles.headerTop}>
                    <div className={styles.headerTitleGroup}>
                        <h1 className={styles.pageTitle}>Welcome, {customer.name.split(' ')[0]}</h1>
                        <p className={styles.pageSubtitle}>Here is what&apos;s happening with your manufacturing today.</p>
                    </div>
                    <Button variant="primary" onClick={() => router.push(`/customers/${customer.id}/catalog`)}>
                        <ShoppingCart size={18} />
                        <span>New Order</span>
                    </Button>
                </div>
            </header>

            <div className={styles.widgetGrid}>
                <StatWidget
                    label="Active Orders"
                    value={activeOrdersCount}
                    icon={<ShoppingBag size={20} />}
                    accentColor="#0071E3"
                    accentBg="rgba(0,113,227,0.08)"
                />
                <StatWidget
                    label="In Production"
                    value={inProductionCount}
                    icon={<Activity size={20} />}
                    accentColor="#FF9500"
                    accentBg="rgba(255,149,0,0.08)"
                />
                <StatWidget
                    label="Pending Payments"
                    value={formatCurrency(metrics.outstandingDue)}
                    icon={<CreditCard size={20} />}
                    accentColor="#FF3B30"
                    accentBg="rgba(255,59,48,0.08)"
                    badge={metrics.outstandingDue > 0 ? "Action needed" : "All clear"}
                    badgeType={metrics.outstandingDue > 0 ? "urgent" : "positive"}
                />
                <StatWidget
                    label="Lifetime Value"
                    value={formatCurrency(metrics.lifetimeRevenue)}
                    icon={<CheckCircle2 size={20} />}
                    accentColor="#34C759"
                    accentBg="rgba(52,199,89,0.08)"
                />
            </div>

            <div className={styles.dashboardContent}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Recent Activity</h2>
                </div>
                
                <div className={styles.timeline}>
                    {activity.length === 0 ? (
                        <p className={styles.emptyText}>No recent updates found.</p>
                    ) : (
                        activity.slice(0, 10).map((item: any, idx: number) => (
                            <div key={idx} className={styles.timelineItem}>
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineTitle}>{item.message}</div>
                                    <div className={styles.timelineTime}>
                                        {new Date(item.created_at * 1000).toLocaleString('en-IN', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={styles.mobileQuickActions}>
                <a href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} target="_blank" className={styles.whatsappFab}>
                    <MessageCircle size={24} />
                    <span>Support</span>
                </a>
            </div>
        </div>
    );
}
