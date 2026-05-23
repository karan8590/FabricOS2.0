import React from 'react';
import { 
    Activity, ShieldAlert, CreditCard, Scissors, Droplets, Plus, 
    Trash2, Edit3, Send, CheckCircle2, Clock, CheckCircle
} from 'lucide-react';
import styles from './ActivityTimeline.module.css';

interface AuditLog {
    id: number;
    timestamp: number;
    user_name: string;
    action: string;
    entity_label: string;
    changes?: string; // JSON string
}

interface ActivityTimelineProps {
    logs: AuditLog[];
    loading?: boolean;
}

const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
        case 'create': return <Plus size={16} className={styles.iconCreate} />;
        case 'update': return <Edit3 size={16} className={styles.iconUpdate} />;
        case 'delete': return <Trash2 size={16} className={styles.iconDelete} />;
        case 'status_change': return <Activity size={16} className={styles.iconStatus} />;
        case 'approve': return <CheckCircle size={16} className={styles.iconApprove} />;
        case 'payment': return <CreditCard size={16} className={styles.iconPayment} />;
        case 'dispatch': return <Send size={16} className={styles.iconDispatch} />;
        default: return <Activity size={16} className={styles.iconDefault} />;
    }
};

const getActionClass = (action: string) => {
    switch (action.toLowerCase()) {
        case 'create': return styles.badgeCreate;
        case 'update': return styles.badgeUpdate;
        case 'delete': return styles.badgeDelete;
        case 'status_change': return styles.badgeStatus;
        case 'approve': return styles.badgeApprove;
        case 'payment': return styles.badgePayment;
        case 'dispatch': return styles.badgeDispatch;
        default: return styles.badgeDefault;
    }
};

const formatChanges = (changesStr?: string) => {
    if (!changesStr) return null;
    try {
        const changes = JSON.parse(changesStr);
        if (Object.keys(changes).length === 0) return null;

        return (
            <div className={styles.changesBox}>
                {Object.entries(changes).map(([key, val]: [string, any]) => {
                    // Check if old/new format
                    if (val && typeof val === 'object' && ('old' in val || 'new' in val)) {
                        return (
                            <div key={key} className={styles.changeItem}>
                                <span className={styles.changeKey}>{key}:</span>
                                <span className={styles.changeOld}>{String(val.old || 'none')}</span>
                                <span className={styles.changeArrow}>→</span>
                                <span className={styles.changeNew}>{String(val.new || 'none')}</span>
                            </div>
                        );
                    }
                    // Simple key/value format
                    return (
                        <div key={key} className={styles.changeItem}>
                            <span className={styles.changeKey}>{key}:</span>
                            <span className={styles.changeNew}>{String(val)}</span>
                        </div>
                    );
                })}
            </div>
        );
    } catch {
        return null;
    }
};

export default function ActivityTimeline({ logs, loading = false }: ActivityTimelineProps) {
    if (loading) {
        return <div className={styles.loading}>Loading activity...</div>;
    }

    if (!logs || logs.length === 0) {
        return <div className={styles.empty}>No recent activity recorded.</div>;
    }

    return (
        <div className={styles.timeline}>
            {logs.map((log) => (
                <div key={log.id} className={styles.timelineItem}>
                    <div className={styles.timelineIcon}>
                        {getActionIcon(log.action)}
                    </div>
                    <div className={styles.timelineContent}>
                        <div className={styles.timelineHeader}>
                            <span className={styles.timelineUser}>{log.user_name || 'System'}</span>
                            <span className={`${styles.timelineAction} ${getActionClass(log.action)}`}>
                                {log.action.replace('_', ' ')}
                            </span>
                            {log.entity_label && <span className={styles.timelineEntity}>{log.entity_label}</span>}
                            <span className={styles.timelineTime}>
                                {new Date(log.timestamp * 1000).toLocaleString('en-IN', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                        {formatChanges(log.changes)}
                    </div>
                </div>
            ))}
        </div>
    );
}
