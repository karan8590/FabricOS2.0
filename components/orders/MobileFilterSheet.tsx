'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import styles from './MobileFilterSheet.module.css';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

const MONTHS = [
    { value: 'all', label: 'All' },
    { value: '1',  label: 'Jan' }, { value: '2',  label: 'Feb' },
    { value: '3',  label: 'Mar' }, { value: '4',  label: 'Apr' },
    { value: '5',  label: 'May' }, { value: '6',  label: 'Jun' },
    { value: '7',  label: 'Jul' }, { value: '8',  label: 'Aug' },
    { value: '9',  label: 'Sep' }, { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
];

const STATUS_OPTIONS = [
    { value: ORDER_STATUSES.CREATED,    label: 'Order Placed',   emoji: '📋' },
    { value: ORDER_STATUSES.APPROVED,   label: 'Approved',       emoji: '✅' },
    { value: ORDER_STATUSES.EMBROIDERY, label: 'At Embroidery',  emoji: '🧵' },
    { value: ORDER_STATUSES.PRINTING,   label: 'Printing',       emoji: '🖨️' },
    { value: ORDER_STATUSES.DYEING,     label: 'At Dyeing',      emoji: '🎨' },
    { value: ORDER_STATUSES.READY,      label: 'Ready',          emoji: '📦' },
    { value: ORDER_STATUSES.DISPATCHED, label: 'Dispatched',     emoji: '🚚' },
    { value: ORDER_STATUSES.DELIVERED,  label: 'Delivered',      emoji: '✔️' },
];

interface MobileFilterSheetProps {
    isOpen: boolean;
    onClose: () => void;
    selectedMonth: string;
    selectedYear: string;
    selectedStatuses: string[];
    years: string[];
    onApply: (statuses: string[], month: string, year: string) => void;
}

export default function MobileFilterSheet({
    isOpen,
    onClose,
    selectedMonth,
    selectedYear,
    selectedStatuses,
    years,
    onApply,
}: MobileFilterSheetProps) {
    const [draftStatuses, setDraftStatuses] = useState<string[]>(selectedStatuses);
    const [draftMonth,    setDraftMonth]    = useState(selectedMonth);
    const [draftYear,     setDraftYear]     = useState(selectedYear);

    // Sync when sheet opens
    React.useEffect(() => {
        if (isOpen) {
            setDraftStatuses(selectedStatuses);
            setDraftMonth(selectedMonth);
            setDraftYear(selectedYear);
        }
    }, [isOpen, selectedStatuses, selectedMonth, selectedYear]);

    const toggleStatus = (val: string) => {
        setDraftStatuses(prev =>
            prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
        );
    };

    const activeCount = draftStatuses.length +
        (draftMonth !== 'all' ? 1 : 0) +
        (draftYear !== 'All Years' ? 1 : 0);

    const handleReset = () => {
        setDraftStatuses([]);
        setDraftMonth('all');
        setDraftYear(new Date().getFullYear().toString());
    };

    const handleApply = () => {
        onApply(draftStatuses, draftMonth, draftYear);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.sheet}>
                <div className={styles.handle} />

                {/* Header */}
                <div className={styles.sheetHeader}>
                    <h2 className={styles.sheetTitle}>
                        <SlidersHorizontal size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        Filters
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Status */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Order Stage</div>
                    <div className={styles.chipGrid}>
                        {STATUS_OPTIONS.map(s => (
                            <button
                                key={s.value}
                                className={`${styles.chip} ${draftStatuses.includes(s.value) ? styles.chipActive : ''}`}
                                onClick={() => toggleStatus(s.value)}
                            >
                                {s.emoji} {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Month */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Month</div>
                    <div className={styles.monthRow}>
                        {MONTHS.map(m => (
                            <button
                                key={m.value}
                                className={`${styles.monthChip} ${draftMonth === m.value ? styles.monthChipActive : ''}`}
                                onClick={() => setDraftMonth(m.value)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Year */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Year</div>
                    <div className={styles.yearRow}>
                        {years.map(y => (
                            <button
                                key={y}
                                className={`${styles.monthChip} ${draftYear === y ? styles.monthChipActive : ''}`}
                                onClick={() => setDraftYear(y)}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.sheetFooter}>
                    <button className={styles.resetBtn} onClick={handleReset}>Reset</button>
                    <button className={styles.applyBtn} onClick={handleApply}>
                        Apply Filters
                        {activeCount > 0 && (
                            <span className={styles.activeBadge}>{activeCount}</span>
                        )}
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}
