import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, icon, className = '', ...props }, ref) => {
        const wrapperClasses = [
            styles.inputWrapper,
            error ? styles.error : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={wrapperClasses}>
                {label && <label className={styles.label}>{label}</label>}
                <div className={styles.inputContainer}>
                    {icon && <div className={styles.icon}>{icon}</div>}
                    <input
                        ref={ref}
                        className={`${styles.input} ${icon ? styles.withIcon : ''}`}
                        {...props}
                    />
                </div>
                {error && <span className={styles.errorMessage}>{error}</span>}
                {helperText && !error && (
                    <span className={styles.helperText}>{helperText}</span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
