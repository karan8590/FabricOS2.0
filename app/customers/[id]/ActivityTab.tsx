'use client';

import React from 'react';
import { 
    ShoppingBag, Play, Receipt, 
    CreditCard, MessageCircle, User, 
    CheckCircle2 
} from 'lucide-react';
import styles from './Tabs.module.css';

interface ActivityTabProps {
    activity: any[];
}

export default function ActivityTab({ activity }: ActivityTabProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'order_created': return <ShoppingBag size={14} />;
            case 'production_started': return <Play size={14} />;
            case 'invoice_generated': return <Receipt size={14} />;
            case 'payment_received': return <CreditCard size={14} />;
            case 'whatsapp_shared': return <MessageCircle size={14} />;
            case 'delivered': return <CheckCircle2 size={14} />;
            default: return <User size={14} />;
        }
    };

    const formatRelativeTime = (ts: number) => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - ts;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(ts * 1000).toLocaleDateString();
    };

    return (
        <div className={styles.tabContent}>
            <div className={styles.activityTimeline}>
                {activity.length === 0 ? (
                    <div className={styles.emptyState}>No recent activity</div>
                ) : (
                    activity.map((a, idx) => (
                        <div key={a.id} className={styles.activityItem}>
                            <div className={styles.activityLine} />
                            <div className={`${styles.activityIcon} ${styles[a.type]}`}>
                                {getIcon(a.type)}
                            </div>
                            <div className={styles.activityBody}>
                                <div className={styles.activityHeader}>
                                    <span className={styles.activityTitle}>{a.title}</span>
                                    <span className={styles.activityTime}>{formatRelativeTime(a.created_at)}</span>
                                </div>
                                {a.description && <p className={styles.activityDesc}>{a.description}</p>}
                                <div className={styles.activityUser}>
                                    <span className={styles.userDot} />
                                    <span>Updated by Admin</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
