import React from 'react';
import { Calendar } from 'lucide-react';
import styles from './ViewingPeriodSelector.module.css';

interface ViewingPeriodSelectorProps {
    selectedYear: string;
    selectedMonth: string;
    onChangeYear: (year: string) => void;
    onChangeMonth: (month: string) => void;
    years?: string[];
    months?: { value: string; label: string }[];
    compact?: boolean;
}

export default function ViewingPeriodSelector({
    selectedYear,
    selectedMonth,
    onChangeYear,
    onChangeMonth,
    years = ['All Years', '2023', '2024', '2025', '2026'],
    months = [
        { value: 'all', label: 'All Months' },
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ],
    compact = false
}: ViewingPeriodSelectorProps) {
    if (compact) {
        return (
            <div className={styles.compactContainer}>
                <div className={styles.compactLabel}>
                    <Calendar size={13} />
                    <span>Viewing Period</span>
                </div>
                <select 
                    value={selectedYear} 
                    onChange={(e) => onChangeYear(e.target.value)}
                    className={styles.compactSelect}
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: '12px' }}>|</span>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => onChangeMonth(e.target.value)}
                    className={styles.compactSelect}
                >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>
        );
    }

    return (
        <div className={styles.periodSelectorRow}>
            <div className={styles.selectorGroup}>
                <div className={styles.selectorLabel}>
                    <Calendar size={14} />
                    <span>Viewing Period</span>
                </div>
                <div className={styles.periodControls}>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => onChangeYear(e.target.value)}
                        className={styles.periodSelect}
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => onChangeMonth(e.target.value)}
                        className={styles.periodSelect}
                    >
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}
