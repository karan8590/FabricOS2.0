import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    loading?: boolean;
    children: React.ReactNode;
}

export default function Button({
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    loading = false,
    className = '',
    children,
    disabled,
    ...props
}: ButtonProps) {
    const classes = [
        styles.button,
        styles[variant],
        size !== 'medium' ? styles[size] : '',
        fullWidth ? styles.fullWidth : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button className={classes} disabled={disabled || loading} {...props}>
            {loading ? 'Processing...' : children}
        </button>
    );
}
