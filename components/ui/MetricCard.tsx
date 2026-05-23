import React from 'react';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  accentColor?: string;
  accentBg?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export default function MetricCard({
  label,
  value,
  change,
  accentColor,
  accentBg,
  icon,
  onClick,
  active = false,
}: MetricCardProps) {
  const cardClasses = [
    styles.card,
    onClick ? styles.clickable : '',
    active ? styles.active : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      style={{
        '--accent-color': accentColor || 'var(--accent)',
        '--accent-bg': accentBg || 'var(--accent-bg)',
      } as React.CSSProperties}
    >
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <div className={styles.iconBox} style={{ color: accentColor, background: accentBg }}>
            {icon}
          </div>
        )}
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {change && (
          <span
            className={`${styles.change} ${
              change.type === 'increase'
                ? styles.increase
                : change.type === 'decrease'
                ? styles.decrease
                : styles.neutral
            }`}
          >
            {change.value}
          </span>
        )}
      </div>
    </div>
  );
}
