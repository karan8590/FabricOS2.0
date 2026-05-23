import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, 
    CalendarDays, 
    CalendarRange, 
    Tag, 
    IndianRupee, 
    Search, 
    User, 
    Layers, 
    SlidersHorizontal,
    X,
    Activity,
    TrendingUp,
    CreditCard
} from 'lucide-react';
import styles from './AdvancedFilter.module.css';

export type FilterType = 'select' | 'text' | 'number' | 'date' | 'dateRange' | 'customer';

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterDefinition {
    id: string;
    label: string;
    type: FilterType;
    icon?: any;
    options?: FilterOption[];
    multiSelect?: boolean;
}

export interface FilterRow {
    id: string;
    fieldId: string;
    operator: string;
    value: any;
}

interface AdvancedFilterProps {
    availableFilters: FilterDefinition[];
    onApply: (filters: FilterRow[]) => void;
    activeFilters?: FilterRow[];
    resultsCount?: number;
    resultsLabel?: string;
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ 
    availableFilters, 
    onApply, 
    activeFilters = [],
    resultsCount = 0,
    resultsLabel = 'results'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [rows, setRows] = useState<FilterRow[]>(activeFilters);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    // Sync external active filters
    useEffect(() => {
        setRows(activeFilters);
    }, [activeFilters]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const getIconInfo = (fieldId: string) => {
        const id = fieldId.toLowerCase();
        
        // Category
        if (id.includes('category')) {
            return { icon: SlidersHorizontal, bg: 'rgba(59,130,246,0.14)', color: '#60A5FA' };
        }
        // Payment Mode
        if (id.includes('paymentmode')) {
            return { icon: CreditCard, bg: 'rgba(34,197,94,0.14)', color: '#4ADE80' };
        }
        // Entry Type
        if (id.includes('entrytype')) {
            return { icon: Layers, bg: 'rgba(168,85,247,0.14)', color: '#C084FC' };
        }
        // Amount Range
        if (id.includes('amount') || id.includes('outstanding')) {
            return { icon: IndianRupee, bg: 'rgba(34,197,94,0.14)', color: '#4ADE80' };
        }
        // Date Range
        if (id.includes('date') || id.includes('year') || id.includes('month')) {
            return { icon: CalendarRange, bg: 'rgba(168,85,247,0.14)', color: '#C084FC' };
        }
        
        if (id.includes('status')) return { icon: Tag, bg: 'rgba(255,149,0,0.12)', color: '#FF9500' };
        if (id.includes('ltv')) return { icon: TrendingUp, bg: 'rgba(0,113,227,0.12)', color: '#0071E3' };
        if (id.includes('behavior')) return { icon: Activity, bg: 'rgba(255,149,0,0.12)', color: '#FF9500' };
        if (id.includes('search')) return { icon: Search, bg: 'rgba(142,142,147,0.12)', color: '#6E6E73' };
        if (id.includes('customer')) return { icon: User, bg: 'rgba(0,113,227,0.12)', color: '#0071E3' };
        if (id.includes('design')) return { icon: Layers, bg: 'rgba(175,82,222,0.12)', color: '#AF52DE' };
        return { icon: SlidersHorizontal, bg: '#F5F5F7', color: '#1D1D1F' };
    };

    const handleFieldToggle = (fieldId: string) => {
        if (selectedFieldId === fieldId) {
            setSelectedFieldId(null);
        } else {
            setSelectedFieldId(fieldId);
        }
    };

    const updateFilterValue = (fieldId: string, value: any, isMulti: boolean = false) => {
        const existingRowIndex = rows.findIndex(r => r.fieldId === fieldId);
        const field = availableFilters.find(f => f.id === fieldId);
        
        let newRows = [...rows];
        if (existingRowIndex >= 0) {
            if (isMulti) {
                const currentVal = Array.isArray(newRows[existingRowIndex].value) ? newRows[existingRowIndex].value : [newRows[existingRowIndex].value];
                const newVal = currentVal.includes(value) 
                    ? currentVal.filter((v: any) => v !== value)
                    : [...currentVal, value];
                
                if (newVal.length === 0) {
                    newRows.splice(existingRowIndex, 1);
                } else {
                    newRows[existingRowIndex] = { ...newRows[existingRowIndex], value: newVal };
                }
            } else {
                if (value === null || value === '') {
                    newRows.splice(existingRowIndex, 1);
                } else {
                    newRows[existingRowIndex] = { ...newRows[existingRowIndex], value };
                }
            }
        } else if (value !== null && value !== '') {
            newRows.push({
                id: Math.random().toString(36).substr(2, 9),
                fieldId,
                operator: field?.type === 'dateRange' || field?.type === 'number' ? 'between' : 'is',
                value: isMulti ? [value] : value
            });
        }
        setRows(newRows);
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const handleApply = () => {
        onApply(rows);
        setIsOpen(false);
    };

    const handleClearAll = () => {
        setRows([]);
        onApply([]);
        setIsOpen(false);
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('pending')) return '#FF9500';
        if (s.includes('approved')) return '#0071E3';
        if (s.includes('production')) return '#AF52DE';
        if (s.includes('completed')) return '#34C759';
        if (s.includes('cancelled')) return '#FF3B30';
        return '#0071E3';
    };

    // Filter out duplicate Customer chips if any
    const uniqueFilters = availableFilters.filter((f, index, self) => 
        index === self.findIndex((t) => t.id === f.id || (t.label === f.label && t.label === 'Customer'))
    );

    return (
        <div className={styles.container}>
            <button 
                className={`action-btn-secondary ${rows.length > 0 ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ position: 'relative' }}
            >
                <SlidersHorizontal size={16} color={rows.length > 0 ? '#0071E3' : 'currentColor'} />
                <span>Filter</span>
                {rows.length > 0 && <span className={styles.badge}>{rows.length}</span>}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        className={styles.popup} 
                        ref={popupRef}
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                        <div className={styles.header}>
                            <h3 className={styles.title}>Filters</h3>
                            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className={styles.content}>
                            {/* Category Grid */}
                            <div className={styles.gridSection}>
                                <span className={styles.sectionLabel}>Add Filter</span>
                                <div className={styles.fieldGrid}>
                                    {uniqueFilters.map(field => {
                                        const { icon: Icon, bg, color } = getIconInfo(field.id);
                                        const isSelected = selectedFieldId === field.id;

                                        return (
                                            <button 
                                                key={field.id}
                                                className={`${styles.chipBtn} ${isSelected ? styles.chipSelected : ''}`}
                                                onClick={() => handleFieldToggle(field.id)}
                                            >
                                                <div className={styles.iconBox} style={{ background: bg, color: color }}>
                                                    <Icon size={18} />
                                                </div>
                                                <span className={styles.chipLabel}>{field.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Applied Tags Row */}
                            {rows.length > 0 && (
                                <div className={styles.tagsRow}>
                                    {rows.map(row => {
                                        const field = availableFilters.find(f => f.id === row.fieldId);
                                        let displayValue = '';
                                        
                                        if (Array.isArray(row.value)) {
                                            displayValue = row.value.map(v => {
                                                const opt = field?.options?.find(o => o.value === v);
                                                return opt ? opt.label : v;
                                            }).join(', ');
                                        } else if (field?.type === 'select') {
                                            displayValue = field.options?.find(o => o.value === row.value)?.label || row.value;
                                        } else if (typeof row.value === 'object' && row.value !== null) {
                                            displayValue = `${row.value.start || '?'} – ${row.value.end || '?'}`;
                                        } else {
                                            displayValue = row.value;
                                        }

                                        return (
                                            <div key={row.id} className={styles.tag}>
                                                <span>{field?.label}: {displayValue}</span>
                                                <button className={styles.removeTagBtn} onClick={() => removeRow(row.id)}>
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Active Input Area (Smooth Expand) */}
                            <AnimatePresence mode="wait">
                                {selectedFieldId && (
                                    <motion.div 
                                        key={selectedFieldId}
                                        className={styles.inputArea}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                    >
                                        <span className={styles.inputLabel}>
                                            {availableFilters.find(f => f.id === selectedFieldId)?.label}
                                        </span>
                                        
                                        {(() => {
                                            const field = availableFilters.find(f => f.id === selectedFieldId);
                                            const row = rows.find(r => r.fieldId === selectedFieldId);
                                            const isMulti = field?.multiSelect || field?.id === 'status';

                                            if (field?.id === 'year' || field?.id === 'month' || field?.type === 'select') {
                                                const options = field?.options?.map(o => o.value) || (field?.id === 'year' ? ['2023', '2024', '2025', '2026'] : []);
                                                const labels = field?.options?.map(o => o.label) || options;

                                                return (
                                                    <div className={styles.pillRow}>
                                                        {options.map((opt, i) => {
                                                            const isSelected = Array.isArray(row?.value) 
                                                                ? row?.value.includes(opt)
                                                                : row?.value === opt;
                                                            const statusColor = field?.id === 'status' ? getStatusColor(labels[i]) : null;
                                                            return (
                                                                <button 
                                                                    key={opt}
                                                                    className={`${styles.pill} ${isSelected ? styles.pillSelected : ''}`}
                                                                    style={isSelected && statusColor ? { background: statusColor } : {}}
                                                                    onClick={() => updateFilterValue(selectedFieldId, opt, isMulti)}
                                                                >
                                                                    {labels[i]}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }

                                            if (field?.type === 'dateRange' || field?.type === 'number') {
                                                return (
                                                    <div className={styles.rangeRow}>
                                                        <input 
                                                            type={field.type === 'number' ? 'number' : 'date'}
                                                            className={`${styles.input} ${styles.halfWidth}`}
                                                            placeholder={field.type === 'number' ? 'Min ₹' : 'From'}
                                                            value={row?.value?.start || ''}
                                                            onChange={(e) => updateFilterValue(selectedFieldId, { ...row?.value, start: e.target.value })}
                                                        />
                                                        <input 
                                                            type={field.type === 'number' ? 'number' : 'date'}
                                                            className={`${styles.input} ${styles.halfWidth}`}
                                                            placeholder={field.type === 'number' ? 'Max ₹' : 'To'}
                                                            value={row?.value?.end || ''}
                                                            onChange={(e) => updateFilterValue(selectedFieldId, { ...row?.value, end: e.target.value })}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <input 
                                                    type="text"
                                                    className={styles.input}
                                                    placeholder={`Enter ${field?.label}...`}
                                                    value={row?.value || ''}
                                                    onChange={(e) => updateFilterValue(selectedFieldId, e.target.value)}
                                                />
                                            );
                                        })()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className={styles.footer}>
                            <button className={styles.clearAllBtn} onClick={handleClearAll}>Clear All</button>
                            <div className={styles.resultsCount}>{resultsCount} {resultsLabel} match</div>
                            <button className={styles.applyBtn} onClick={handleApply}>Apply Filters</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdvancedFilter;
