import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './GroupedPeriodSection.module.css';

export interface MetricInfo {
    value: string | number;
    label: string;
    type?: 'warning' | 'urgent' | 'success' | 'info' | 'neutral';
}

interface GroupedPeriodSectionProps {
    monthName: string;
    year: string;
    metrics: MetricInfo[];
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

export default function GroupedPeriodSection({
    monthName,
    year,
    metrics,
    isExpanded,
    onToggle,
    children
}: GroupedPeriodSectionProps) {
    return (
        <div className={styles.monthGroup}>
            <div className={styles.monthGroupHeader} onClick={onToggle}>
                <div className={styles.monthGroupTitleGroup}>
                    <ChevronDown 
                        size={16} 
                        className={`${styles.collapseArrow} ${isExpanded ? styles.collapseArrowExpanded : ''}`}
                    />
                    <span className={styles.monthGroupTitle}>{monthName.toUpperCase()} {year}</span>
                </div>

                <div className={styles.monthGroupSummaryPills}>
                    {metrics.map((metric, idx) => {
                        let pillClass = styles.summaryPill;
                        if (metric.type === 'warning') pillClass = `${styles.summaryPill} ${styles.pillWarning}`;
                        else if (metric.type === 'urgent') pillClass = `${styles.summaryPill} ${styles.pillUrgent}`;
                        else if (metric.type === 'success') pillClass = `${styles.summaryPill} ${styles.pillSuccess}`;
                        else if (metric.type === 'info') pillClass = `${styles.summaryPill} ${styles.pillInfo}`;

                        return (
                            <div key={idx} className={pillClass}>
                                <span className={styles.pillValue}>{metric.value}</span>
                                <span className={styles.pillLabel}>{metric.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={`${styles.monthGroupContent} ${isExpanded ? styles.monthGroupContentExpanded : ''}`}>
                {isExpanded && children}
            </div>
        </div>
    );
}
