'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './MonthPicker.module.css';

interface MonthPickerProps {
    value: string; // Format: "YYYY-MM"
    onChange: (value: string) => void;
    label?: string;
}

export default function MonthPicker({ value, onChange, label }: MonthPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Parse initial value or default to current date
    const dateParts = value ? value.split('-') : [];
    const initialYear = dateParts.length === 2 ? parseInt(dateParts[0]) : new Date().getFullYear();
    const initialMonth = dateParts.length === 2 ? parseInt(dateParts[1]) - 1 : new Date().getMonth();

    const [viewYear, setViewYear] = useState(initialYear);
    const containerRef = useRef<HTMLDivElement>(null);

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const fullMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handlePrevYear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewYear(prev => prev - 1);
    };

    const handleNextYear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewYear(prev => prev + 1);
    };

    const handleMonthSelect = (monthIndex: number) => {
        const paddedMonth = String(monthIndex + 1).padStart(2, '0');
        onChange(`${viewYear}-${paddedMonth}`);
        setIsOpen(false);
    };

    const currentMonthValue = new Date().getMonth();
    const currentYearValue = new Date().getFullYear();

    const getDisplayValue = () => {
        if (!value) return 'Select Month';
        const [y, m] = value.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {isOpen && <div className={styles.backdrop} onClick={() => setIsOpen(false)} />}

            <button
                className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <span>{getDisplayValue()}</span>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M7 14h.01M7 18h.01M12 14h.01M12 18h.01M17 14h.01M17 18h.01" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </button>

            {isOpen && (
                <div className={styles.popover}>
                    <div className={styles.header}>
                        <button className={styles.navButton} onClick={handlePrevYear}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <span className={styles.currentYear}>{viewYear}</span>
                        <button className={styles.navButton} onClick={handleNextYear}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.monthGrid}>
                        {months.map((month, index) => {
                            const isSelected = value === `${viewYear}-${String(index + 1).padStart(2, '0')}`;
                            const isCurrent = viewYear === currentYearValue && index === currentMonthValue;

                            return (
                                <button
                                    key={month}
                                    className={`${styles.monthButton} ${isSelected ? styles.selected : ''} ${isCurrent ? styles.current : ''}`}
                                    onClick={() => handleMonthSelect(index)}
                                >
                                    {month}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
