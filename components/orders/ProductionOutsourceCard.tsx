'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Droplets, Plus, Send, Trash2, FileText, History } from 'lucide-react';
import styles from './ProductionOutsourceCard.module.css';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ProcessType = 'embroidery' | 'dyeing';

export interface VendorDispatch {
    id: number;
    vendor_name: string;
    process_type: ProcessType;
    status: 'sent' | 'returned' | 'cancelled';
    total_meters?: number;
    rate_per_meter?: number;
    total_cost?: number;
    sent_date?: number;           // Unix timestamp
    expected_return_date?: number; // Unix timestamp
    dispatch_number?: string;
    notes?: string;
}

export interface JobCostEntry {
    id: number;
    vendor_name: string;
    type: ProcessType;
    metres?: number;
    rate_per_metre?: number;
    total_cost?: number;
    status: 'paid' | 'unpaid';
    amount_paid?: number;
    notes?: string;
}

export interface OutsourceCardProps {
    type: ProcessType;
    orderId: number | string;
    dispatches: VendorDispatch[];
    jobCosts: JobCostEntry[];
    totalCost: number;
    isCompleted: boolean;
    onSendToVendor: () => void;
    onCostAdded: () => void;
    onDeleteCost?: (costId: number) => void;
    onGenerateChallan?: (entry: JobCostEntry) => void;
}

// ─────────────────────────────────────────────
// ProductionStatusBadge
// ─────────────────────────────────────────────

export const ProductionStatusBadge = memo(function ProductionStatusBadge({
    dispatches,
    jobCosts,
    isCompleted,
}: {
    dispatches: VendorDispatch[];
    jobCosts: JobCostEntry[];
    isCompleted: boolean;
}) {
    if (isCompleted) return <span className={`${styles.badge} ${styles.badgeCompleted}`}>Completed</span>;
    const hasActive = dispatches.some(d => d.status === 'sent') || jobCosts.length > 0;
    if (hasActive) return <span className={`${styles.badge} ${styles.badgeInProgress}`}>In Progress</span>;
    if (dispatches.some(d => d.status === 'cancelled')) return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Cancelled</span>;
    return <span className={`${styles.badge} ${styles.badgeNotStarted}`}>Not Started</span>;
});

// ─────────────────────────────────────────────
// EmptyOutsourceState
// ─────────────────────────────────────────────

export const EmptyOutsourceState = memo(function EmptyOutsourceState({
    type,
}: { type: ProcessType }) {
    const Icon = type === 'embroidery' ? Scissors : Droplets;
    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
                <Icon size={28} />
            </div>
            <p className={styles.emptyStateTitle}>No {type} outsourcing added yet</p>
            <p className={styles.emptyStateHint}>Use "Send to Vendor" or Quick Add Cost</p>
        </div>
    );
});

// ─────────────────────────────────────────────
// OutsourceEntryCard — Vendor Dispatch tile
// ─────────────────────────────────────────────

export const OutsourceEntryCard = memo(function OutsourceEntryCard({
    dispatch,
    type,
}: {
    dispatch: VendorDispatch;
    type: ProcessType;
}) {
    const Icon = type === 'embroidery' ? Scissors : Droplets;
    const iconColor = type === 'embroidery' ? '#FF9F0A' : '#0A84FF';

    const statusClass =
        dispatch.status === 'returned' ? styles.badgeCompleted
        : dispatch.status === 'cancelled' ? styles.badgeCancelled
        : styles.badgeInProgress;

    const statusLabel =
        dispatch.status === 'sent' ? 'In Progress'
        : dispatch.status === 'returned' ? 'Returned'
        : 'Cancelled';

    const fmtDate = (ts?: number) =>
        ts ? new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

    return (
        <div className={styles.entryTile}>
            <div className={styles.entryTileHeader}>
                <div className={styles.entryVendorName}>
                    <Icon size={13} color={iconColor} style={{ flexShrink: 0 }} />
                    {dispatch.vendor_name}
                </div>
                <span className={`${styles.badge} ${statusClass}`}>{statusLabel}</span>
            </div>

            <div className={styles.entryTileBody}>
                {dispatch.total_meters != null && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Metres</span>
                        <span className={styles.entryStatVal}>{parseFloat(String(dispatch.total_meters)).toFixed(1)} m</span>
                    </div>
                )}
                {dispatch.rate_per_meter != null && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Rate</span>
                        <span className={styles.entryStatVal}>₹{parseFloat(String(dispatch.rate_per_meter)).toFixed(0)}/m</span>
                    </div>
                )}
                {dispatch.total_cost != null && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Cost</span>
                        <span className={styles.entryStatValBold}>₹{parseFloat(String(dispatch.total_cost)).toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div className={styles.entryStat}>
                    <span className={styles.entryStatLabel}>Sent</span>
                    <span className={styles.entryStatVal}>{fmtDate(dispatch.sent_date)}</span>
                </div>
                {dispatch.expected_return_date && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Due</span>
                        <span className={styles.entryStatVal}>{fmtDate(dispatch.expected_return_date)}</span>
                    </div>
                )}
                {dispatch.dispatch_number && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Challan</span>
                        <span className={styles.entryDispatchRef}>{dispatch.dispatch_number}</span>
                    </div>
                )}
            </div>

            {dispatch.notes && <div className={styles.entryNotes}>{dispatch.notes}</div>}
        </div>
    );
});

// ─────────────────────────────────────────────
// JobCostEntryCard — Manual cost tile
// ─────────────────────────────────────────────

export const JobCostEntryCard = memo(function JobCostEntryCard({
    entry,
    type,
    onDelete,
    onGenerateChallan,
}: {
    entry: JobCostEntry;
    type: ProcessType;
    onDelete?: (id: number) => void;
    onGenerateChallan?: (entry: JobCostEntry) => void;
}) {
    const Icon = type === 'embroidery' ? Scissors : Droplets;
    const iconColor = type === 'embroidery' ? '#FF9F0A' : '#0A84FF';

    return (
        <div className={styles.entryTile}>
            <div className={styles.entryTileHeader}>
                <div className={styles.entryVendorName}>
                    <Icon size={13} color={iconColor} style={{ flexShrink: 0 }} />
                    {entry.vendor_name}
                </div>
                <div className={styles.entryActions}>
                    <span className={`${styles.badge} ${entry.status === 'paid' ? styles.badgeCompleted : styles.badgeInProgress}`}>
                        {entry.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                    {onGenerateChallan && (
                        <button
                            className={styles.iconBtn}
                            title="Generate Job Work Challan"
                            onClick={() => onGenerateChallan(entry)}
                        >
                            <FileText size={13} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                            onClick={() => onDelete(entry.id)}
                            disabled={(entry.amount_paid ?? 0) > 0}
                            title="Delete cost entry"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.entryTileBody}>
                {entry.metres != null && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Metres</span>
                        <span className={styles.entryStatVal}>{entry.metres} m</span>
                    </div>
                )}
                {entry.rate_per_metre != null && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Rate</span>
                        <span className={styles.entryStatVal}>₹{entry.rate_per_metre}/m</span>
                    </div>
                )}
                {entry.total_cost != null && (
                    <div className={styles.entryStat}>
                        <span className={styles.entryStatLabel}>Total</span>
                        <span className={styles.entryStatValBold}>₹{parseFloat(String(entry.total_cost)).toLocaleString('en-IN')}</span>
                    </div>
                )}
            </div>

            {entry.notes && <div className={styles.entryNotes}>{entry.notes}</div>}
        </div>
    );
});

// ─────────────────────────────────────────────
// QuickAddCostForm — inline floating overlay
// ─────────────────────────────────────────────

interface QuickAddFormProps {
    type: ProcessType;
    orderId: number | string;
    onSaved: () => void;
    onCancel: () => void;
}

function QuickAddCostForm({ type, orderId, onSaved, onCancel }: QuickAddFormProps) {
    const [amount, setAmount] = useState('');
    const [vendor, setVendor] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = useCallback(async () => {
        const cost = parseFloat(amount);
        if (!cost || cost <= 0) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/orders/${orderId}/job-costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    vendor_name: vendor || 'Internal',
                    metres: 0,
                    rate_per_metre: 0,
                    total_cost: cost,
                    date: new Date().toISOString().split('T')[0],
                    status: 'unpaid',
                    notes,
                }),
            });
            if (res.ok) onSaved();
        } finally {
            setSaving(false);
        }
    }, [amount, vendor, notes, type, orderId, onSaved]);

    const label = type === 'embroidery' ? 'Embroidery' : 'Dyeing';

    return (
        <motion.div
            className={styles.quickAddOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className={styles.quickAddBox}
                initial={{ scale: 0.92, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 8 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            >
                <p className={styles.quickAddTitle}>Quick Add {label} Cost</p>

                <div className={styles.formField}>
                    <label className={styles.formLabel}>Cost Amount (₹)</label>
                    <input
                        className={styles.formInput}
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>Vendor Name (Optional)</label>
                    <input
                        className={styles.formInput}
                        type="text"
                        placeholder="e.g. Om Embroidery Works"
                        value={vendor}
                        onChange={e => setVendor(e.target.value)}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>Notes</label>
                    <input
                        className={styles.formInput}
                        type="text"
                        placeholder="Optional notes"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <div className={styles.quickAddActions}>
                    <button className={styles.btnSecondary} onClick={onCancel} style={{ flex: 'none', padding: '8px 16px' }}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={handleSave} disabled={saving || !amount} style={{ flex: 'none', padding: '8px 16px' }}>
                        {saving ? 'Saving…' : 'Save Cost'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────
// ProductionOutsourceCard — Main Export
// ─────────────────────────────────────────────

export const ProductionOutsourceCard = memo(function ProductionOutsourceCard({
    type,
    orderId,
    dispatches,
    jobCosts,
    totalCost,
    isCompleted,
    onSendToVendor,
    onCostAdded,
    onDeleteCost,
    onGenerateChallan,
}: OutsourceCardProps) {
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const Icon = type === 'embroidery' ? Scissors : Droplets;
    const label = type === 'embroidery' ? 'Embroidery Outsourcing' : 'Dyeing Outsourcing';
    const hasEntries = dispatches.length > 0 || jobCosts.length > 0;

    const handleCostSaved = useCallback(() => {
        setShowQuickAdd(false);
        onCostAdded();
    }, [onCostAdded]);

    return (
        <div className={styles.card} style={{ position: 'relative' }}>
            {/* Header */}
            <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                    <Icon size={16} color={type === 'embroidery' ? '#FF9F0A' : '#0A84FF'} />
                    <span className={styles.cardTitle}>{label}</span>
                </div>
                <div className={styles.cardHeaderRight}>
                    {totalCost > 0 && (
                        <span className={styles.totalCost}>₹{totalCost.toLocaleString('en-IN')}</span>
                    )}
                    <ProductionStatusBadge
                        dispatches={dispatches}
                        jobCosts={jobCosts}
                        isCompleted={isCompleted}
                    />
                </div>
            </div>

            {/* Body */}
            <div className={styles.cardBody}>
                {hasEntries ? (
                    <>
                        {dispatches.map(d => (
                            <OutsourceEntryCard key={`dispatch-${d.id}`} dispatch={d} type={type} />
                        ))}
                        {jobCosts.map(e => (
                            <JobCostEntryCard
                                key={`cost-${e.id}`}
                                entry={e}
                                type={type}
                                onDelete={onDeleteCost}
                                onGenerateChallan={onGenerateChallan}
                            />
                        ))}
                    </>
                ) : (
                    <EmptyOutsourceState type={type} />
                )}
            </div>

            {/* Footer Actions */}
            <div className={styles.cardFooter}>
                <button className={styles.btnPrimary} onClick={onSendToVendor}>
                    <Send size={12} /> Send to Vendor
                </button>
                <button className={styles.btnSecondary} onClick={() => setShowQuickAdd(true)}>
                    <Plus size={12} /> Quick Add Cost
                </button>
            </div>

            {/* Quick Add Cost Overlay */}
            <AnimatePresence>
                {showQuickAdd && (
                    <QuickAddCostForm
                        type={type}
                        orderId={orderId}
                        onSaved={handleCostSaved}
                        onCancel={() => setShowQuickAdd(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});

// ─────────────────────────────────────────────
// ProductionOutsourceSection — Grid Container
// ─────────────────────────────────────────────

export interface OutsourceSectionProps {
    order: any;
    onUpdate: () => void;
    onSendToVendor: (type: ProcessType) => void;
    onGenerateChallan?: (entry: JobCostEntry) => void;
    onDeleteCost?: (costId: number) => void;
}

const STEPS_ORDER = ['created', 'approved', 'embroidery', 'printing', 'dyeing', 'ready', 'dispatched', 'delivered'];

export const ProductionOutsourceSection = memo(function ProductionOutsourceSection({
    order,
    onUpdate,
    onSendToVendor,
    onGenerateChallan,
    onDeleteCost,
}: OutsourceSectionProps) {
    const status = order.status?.toLowerCase() || 'created';
    const currentIdx = STEPS_ORDER.indexOf(status);

    const embroideryDispatches: VendorDispatch[] = order.vendorDispatches?.filter((d: any) => d.process_type === 'embroidery') ?? [];
    const dyeingDispatches: VendorDispatch[] = order.vendorDispatches?.filter((d: any) => d.process_type === 'dyeing') ?? [];
    const embroideryEntries: JobCostEntry[] = order.jobCosts?.filter((j: any) => j.type === 'embroidery') ?? [];
    const dyeingEntries: JobCostEntry[] = order.jobCosts?.filter((j: any) => j.type === 'dyeing') ?? [];

    const embroideryCost = order.outsourcingTotals?.embroidery ?? (
        embroideryEntries.reduce((s: number, j: any) => s + parseFloat(j.total_cost || 0), 0) +
        embroideryDispatches.reduce((s: number, d: any) => s + parseFloat(d.total_cost || 0), 0)
    );

    const dyeingCost = order.outsourcingTotals?.dyeing ?? (
        dyeingEntries.reduce((s: number, j: any) => s + parseFloat(j.total_cost || 0), 0) +
        dyeingDispatches.reduce((s: number, d: any) => s + parseFloat(d.total_cost || 0), 0)
    );

    return (
        <div className={styles.outsourceGrid}>
            <ProductionOutsourceCard
                type="embroidery"
                orderId={order.id}
                dispatches={embroideryDispatches}
                jobCosts={embroideryEntries}
                totalCost={embroideryCost}
                isCompleted={currentIdx > STEPS_ORDER.indexOf('embroidery')}
                onSendToVendor={() => onSendToVendor('embroidery')}
                onCostAdded={onUpdate}
                onDeleteCost={onDeleteCost}
                onGenerateChallan={onGenerateChallan}
            />
            <ProductionOutsourceCard
                type="dyeing"
                orderId={order.id}
                dispatches={dyeingDispatches}
                jobCosts={dyeingEntries}
                totalCost={dyeingCost}
                isCompleted={currentIdx > STEPS_ORDER.indexOf('dyeing')}
                onSendToVendor={() => onSendToVendor('dyeing')}
                onCostAdded={onUpdate}
                onDeleteCost={onDeleteCost}
                onGenerateChallan={onGenerateChallan}
            />
        </div>
    );
});

export default ProductionOutsourceCard;
