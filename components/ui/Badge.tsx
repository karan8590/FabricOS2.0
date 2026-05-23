import React from 'react';
import styles from './Badge.module.css';

type BadgeStatus =
    | 'pending'
    | 'approved'
    | 'inproduction'
    | 'ready'
    | 'completed'
    | 'invoiced'
    | 'paid'
    | 'unpaid'
    | 'partial'
    | 'overdue';

interface BadgeProps {
    status: BadgeStatus;
    className?: string;
}

export default function Badge({ status, className = '' }: BadgeProps) {
    const classes = [styles.badge, styles[status], className]
        .filter(Boolean)
        .join(' ');

    return <span className={classes}>{status}</span>;
}
