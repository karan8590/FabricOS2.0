import React from 'react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export default function StatusBadge({ label, type = 'neutral', className = '' }: StatusBadgeProps) {
  const classes = [styles.badge, styles[type], className].filter(Boolean).join(' ');
  return <span className={classes}>{label}</span>;
}
export type { StatusBadgeProps };
