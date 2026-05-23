import React from 'react';
import styles from './ProductionActionButton.module.css';

export type ActionTheme = 'blue' | 'cyan' | 'purple' | 'orange' | 'green' | 'indigo' | 'amber';

interface ProductionActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    themeColor: ActionTheme;
    label: string;
    icon?: React.ReactNode;
    isRowHovered?: boolean;
}

export default function ProductionActionButton({
    themeColor,
    label,
    icon,
    isRowHovered,
    className = '',
    disabled,
    ...props
}: ProductionActionButtonProps) {
    const themeClass = {
        'blue': styles.themeBlue,
        'cyan': styles.themeCyan,
        'purple': styles.themePurple,
        'orange': styles.themeOrange,
        'green': styles.themeGreen,
        'indigo': styles.themeIndigo,
        'amber': styles.themeAmber,
    }[themeColor];

    return (
        <button
            className={`${styles.btn} ${themeClass} ${isRowHovered ? styles.hoverActive : ''} ${className}`}
            disabled={disabled}
            {...props}
        >
            {icon && <span className={styles.icon}>{icon}</span>}
            <span>{label}</span>
        </button>
    );
}
