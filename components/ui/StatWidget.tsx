import React from 'react';
import styles from './StatWidget.module.css';

interface StatWidgetProps {
    label: string;
    value: string | number;
    secondaryText?: string;
    badge?: string;
    badgeType?: 'positive' | 'negative' | 'neutral' | 'urgent';
    icon: React.ReactNode;
    accentColor: string;
    accentBg?: string;
    isSelected?: boolean;
    onClick?: () => void;
    pulse?: boolean;
    sublabel?: string;
}

export default function StatWidget({
    label,
    value,
    secondaryText,
    badge,
    badgeType = 'neutral',
    icon,
    accentColor,
    accentBg,
    isSelected = false,
    onClick,
    pulse = false,
    sublabel = 'vs Last Month'
}: StatWidgetProps) {
    
    const finalAccentBg = accentBg || `${accentColor}0A`;
    
    const getBadgeStyles = () => {
        switch (badgeType) {
            case 'positive':
                return { background: 'rgba(52, 199, 89, 0.15)', color: '#34C759' };
            case 'negative':
                return { background: 'rgba(255, 59, 48, 0.15)', color: '#FF3B30' };
            case 'urgent':
                return { background: 'rgba(255, 59, 48, 0.15)', color: '#FF3B30' };
            case 'neutral':
            default:
                return { background: 'var(--bg-grouped)', color: 'var(--text-secondary)' };
        }
    };

    return (
        <div 
            className={`
                ${styles.widget} 
                ${isSelected ? styles.widgetActive : ''} 
                ${pulse ? styles.pulse : ''}
            `}
            style={{
                '--accent-color': accentColor,
                borderColor: isSelected ? accentColor : 'transparent',
                background: isSelected ? finalAccentBg : 'var(--bg-card)',
                boxShadow: isSelected ? `0 12px 24px ${accentColor}26, inset 0 0 20px ${accentColor}0D` : 'var(--shadow-card)'
            } as React.CSSProperties}
            onClick={onClick}
        >
            {isSelected && <div className={styles.selectedBar} style={{ background: accentColor }} />}
            
            <div className={styles.widgetHeader}>
                <div className={styles.iconBox} style={{ background: `${accentColor}1F`, color: accentColor }}>
                    {icon}
                </div>
                <span className={styles.label}>{label}</span>
            </div>

            <div className={styles.bigNumber}>{value}</div>
            
            {secondaryText && (
                <div className={styles.secondaryText}>{secondaryText}</div>
            )}

            <div className={styles.widgetFooter}>
                {badge && (
                    <div className={styles.badge} style={getBadgeStyles()}>
                        {badge}
                    </div>
                )}
                <span className={styles.sublabel}>{sublabel}</span>
            </div>
        </div>
    );
}
