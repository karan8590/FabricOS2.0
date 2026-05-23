import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'glass';
    padding?: 'default' | 'compact' | 'spacious';
    clickable?: boolean;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export default function Card({
    children,
    variant = 'default',
    padding = 'default',
    clickable = false,
    onClick,
    className = '',
    style,
}: CardProps) {
    const classes = [
        styles.card,
        variant !== 'default' ? styles[variant] : '',
        padding !== 'default' ? styles[padding] : '',
        clickable || onClick ? styles.clickable : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} onClick={onClick} style={style}>
            {children}
        </div>
    );
}
