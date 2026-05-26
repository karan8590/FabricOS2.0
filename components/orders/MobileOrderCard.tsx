'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    MoreHorizontal, Eye, Edit2, FileText, Trash2,
    AlertTriangle, QrCode, Calendar, CheckCircle2, Building2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import styles from './MobileOrderCard.module.css';
import IntelligentChip from './IntelligentChip';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/lib/constants';

/* ------------------------------------------------------------------ */
/* Eligibility check for bulk selection                                 */
/* ------------------------------------------------------------------ */
export const isEligibleForBulkAction = (order: any): boolean => {
    const stage = order.order_stage || 'order_added';
    const embStatus = order.embroidery_status;
    const dyeStatus = order.dyeing_status;

    return (
        (stage === 'embroidery' && embStatus === 'queued_delivery') ||
        (stage === 'dyeing'     && dyeStatus === 'queued_delivery') ||
        stage === 'ready'
    );
};

/* ------------------------------------------------------------------ */
/* Stage helpers                                                         */
/* ------------------------------------------------------------------ */
function getStageCss(order: any, isSelected: boolean, isOverdue: boolean): string {
    if (isSelected)  return styles.stageSelected;
    if (isOverdue)   return styles.stageOverdue;

    const stage = order.order_stage || 'order_added';
    if (stage === 'order_added')   return styles.stagePending;
    if (stage === 'delivered')     return styles.stageDone;
    if (stage === 'ready' || stage === 'out_for_delivery') return styles.stageReady;
    return styles.stageProduction;
}

function getStageBadgeLabel(order: any): string {
    const stage = order.order_stage || 'order_added';
    const map: Record<string, string> = {
        order_added:      'Order Placed',
        approved:         'Approved',
        embroidery:       'At Embroidery',
        printing:         'Printing',
        dyeing:           'At Dyeing',
        ready:            'Ready',
        out_for_delivery: 'Out For Delivery',
        delivered:        'Delivered',
    };
    return map[stage] || stage;
}

function getStageBadgeCss(order: any, isOverdue: boolean): string {
    if (isOverdue) return styles.badgeOverdue;
    const stage = order.order_stage || 'order_added';
    const map: Record<string, string> = {
        order_added:      styles.badgePending,
        approved:         styles.badgeApproved,
        embroidery:       styles.badgeEmbroidery,
        printing:         styles.badgePrinting,
        dyeing:           styles.badgeDyeing,
        ready:            styles.badgeReady,
        out_for_delivery: styles.badgeDispatched,
        delivered:        styles.badgeDelivered,
    };
    return map[stage] || styles.badgePending;
}

/* ------------------------------------------------------------------ */
/* Quick action button (stage-driven)                                   */
/* ------------------------------------------------------------------ */
function QuickActionButton({
    order,
    onWorkflowAction,
    onGenerateInvoice,
    setIsCompletePrintingModalOpen,
    setSelectedOrderForPrinting,
}: {
    order: any;
    onWorkflowAction: (action: string, order: any) => void;
    onGenerateInvoice: (order: any) => void;
    setIsCompletePrintingModalOpen: (v: boolean) => void;
    setSelectedOrderForPrinting: (o: any) => void;
}) {
    const [busy, setBusy] = useState(false);
    const stage = order.order_stage || 'order_added';
    const embStatus = order.embroidery_status;
    const dyeStatus = order.dyeing_status;

    const callApi = (action: string) => {
        setBusy(true);
        fetch(`/api/orders/${order.id}/workflow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        }).finally(() => setBusy(false));
    };

    const btn = (label: string, icon: string, variantCss: string, onClick: () => void) => (
        <button
            className={`${styles.quickActionBtn} ${variantCss}`}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            disabled={busy}
        >
            <i className={`ti ${icon}`} />
            {busy ? 'Processing...' : label}
        </button>
    );

    const badge = (label: string, icon: string) => (
        <div className={styles.statusBadgeOnly}>
            <i className={`ti ${icon}`} />
            {label}
        </div>
    );

    if (stage === 'order_added')
        return btn('Approve Order', 'ti-circle-check', styles.actionApprove,
            () => onWorkflowAction('approve', order));

    if (stage === 'approved')
        return btn('Send To Embroidery', 'ti-needle', styles.actionEmbroidery,
            () => onWorkflowAction('send_to_embroidery', order));

    if (stage === 'embroidery' && embStatus === 'in_progress')
        return btn('Complete Printing', 'ti-printer', styles.actionPrinting, () => {
            setSelectedOrderForPrinting(order);
            setIsCompletePrintingModalOpen(true);
        });

    if (stage === 'embroidery' && embStatus === 'queued_delivery')
        return badge('Queued for Embroidery', 'ti-truck-loading');

    if (stage === 'printing')
        return btn('Send To Dyeing', 'ti-droplet', styles.actionDyeing,
            () => onWorkflowAction('send_to_dyeing', order));

    if (stage === 'dyeing' && dyeStatus === 'in_progress')
        return btn('Mark Ready', 'ti-check', styles.actionReady,
            () => callApi('mark_ready'));

    if (stage === 'dyeing' && dyeStatus === 'queued_delivery')
        return badge('Queued for Dyeing', 'ti-truck-loading');

    if (stage === 'ready')
        return badge('Ready For Delivery', 'ti-truck');

    if (stage === 'out_for_delivery')
        return btn('Mark Delivered', 'ti-circle-check', styles.actionDispatch,
            () => callApi('mark_delivered'));

    if (stage === 'delivered') {
        if (!order.invoice_generated)
            return btn('Generate Invoice', 'ti-file-invoice', styles.actionInvoice,
                () => onGenerateInvoice(order));
        return badge('Delivered', 'ti-check');
    }

    return null;
}

/* ------------------------------------------------------------------ */
/* Overflow menu                                                         */
/* ------------------------------------------------------------------ */
function CardMenu({
    order,
    onGenerateInvoice,
    onEdit,
    onUpdate,
}: {
    order: any;
    onGenerateInvoice: (o: any) => void;
    onEdit?: (o: any) => void;
    onUpdate: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const router = useRouter();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleDelete = async () => {
        setDeleting(true);
        const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
        setDeleting(false);
        if (res.ok) { onUpdate(); setConfirmDelete(false); }
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
                <MoreHorizontal size={18} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '6px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                    borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    zIndex: 500, padding: '6px', minWidth: '200px',
                }}>
                    {[
                        { label: 'View Details', icon: <Eye size={14} />, action: () => router.push(`/orders/${order.id}`) },
                        { label: 'Edit Order',   icon: <Edit2 size={14} />, action: () => onEdit?.(order) },
                        !order.invoice_generated && { label: 'Generate Invoice', icon: <FileText size={14} />, action: () => onGenerateInvoice(order), color: '#34C759' },
                        { label: 'Print QR Label', icon: <QrCode size={14} />, action: () => {} },
                        { separator: true },
                        { label: 'Delete Order', icon: <Trash2 size={14} />, action: () => { setOpen(false); setConfirmDelete(true); }, color: '#FF3B30' },
                    ].filter(Boolean).map((item: any, i) =>
                        item.separator
                            ? <div key={i} style={{ height: 1, background: 'var(--border-primary)', margin: '4px 6px' }} />
                            : (
                                <button key={i} onClick={(e) => { e.stopPropagation(); item.action(); setOpen(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                    padding: '9px 12px', background: 'transparent', border: 'none',
                                    borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                                    color: item.color || 'var(--text-primary)', textAlign: 'left',
                                }}>
                                    {item.icon} {item.label}
                                </button>
                            )
                    )}
                </div>
            )}

            {confirmDelete && createPortal(
                <div className="global-modal-overlay" onClick={() => setConfirmDelete(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg-card)', borderRadius: '20px', padding: '28px',
                        maxWidth: '360px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                        textAlign: 'center',
                    }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertTriangle size={22} color="#FF3B30" />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Delete Order?</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                            Order <strong>{order.order_number || `#${order.id}`}</strong> for <strong>{order.customer_name}</strong> will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: 44, borderRadius: '12px', border: '1px solid var(--border-primary)', background: 'var(--bg-grouped)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, height: 44, borderRadius: '12px', border: 'none', background: '#FF3B30', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: deleting ? 0.7 : 1 }}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                        */
/* ------------------------------------------------------------------ */
interface MobileOrderCardProps {
    order: any;
    onUpdate: () => void;
    onGenerateInvoice: (order: any) => void;
    onEdit?: (order: any) => void;
    onWorkflowAction: (action: string, order: any) => void;
    isSelected?: boolean;
    onToggleSelect?: (id: number) => void;
    setIsCompletePrintingModalOpen: (v: boolean) => void;
    setSelectedOrderForPrinting: (o: any) => void;
}

export default function MobileOrderCard({
    order,
    onUpdate,
    onGenerateInvoice,
    onEdit,
    onWorkflowAction,
    isSelected,
    onToggleSelect,
    setIsCompletePrintingModalOpen,
    setSelectedOrderForPrinting,
}: MobileOrderCardProps) {
    const router = useRouter();

    const now = Math.floor(Date.now() / 1000);
    const effectiveDate = order.order_date || order.created_at;
    const deliveryDeadline = effectiveDate + 7 * 24 * 60 * 60;
    const stage = order.order_stage || 'order_added';
    const isFinished = stage === 'delivered';
    const isOverdue = !isFinished && now > deliveryDeadline;

    const eligible = isEligibleForBulkAction(order);

    // Firm display
    const firmLabel = order.firm_name || order.business_name ||
        (order.business_id ? `Firm ${order.business_id}` : null);

    // Avatar initial
    const avatarLetter = (order.customer_name || 'U').trim()[0].toUpperCase();

    // Due date display
    const dueDate = new Date(deliveryDeadline * 1000);
    const dueDateStr = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    // Amount
    const totalAmt = parseFloat(order.total_price || 0).toLocaleString('en-IN');

    return (
        <div
            className={`${styles.card} ${getStageCss(order, !!isSelected, isOverdue)}`}
            onClick={() => router.push(`/orders/${order.id}`)}
        >
            {/* ── Header ── */}
            <div className={styles.cardHeader}>
                <div className={styles.headerLeft}>
                    <span className={`${styles.stageBadge} ${getStageBadgeCss(order, isOverdue)}`}>
                        {isOverdue ? '⚠ Overdue' : getStageBadgeLabel(order)}
                    </span>
                    {order.is_recurring && <span className={styles.recurringIcon} title="Recurring">↻</span>}
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.orderNum}>{order.order_number || `#${order.id}`}</span>
                    <CardMenu
                        order={order}
                        onGenerateInvoice={onGenerateInvoice}
                        onEdit={onEdit}
                        onUpdate={onUpdate}
                    />
                </div>
            </div>

            {/* ── Body ── */}
            <div className={styles.cardBody} onClick={e => e.stopPropagation()}>
                {/* Customer + Amount */}
                <div className={styles.customerRow}>
                    <div className={styles.avatar}>{avatarLetter}</div>
                    <div className={styles.customerInfo}>
                        <div className={styles.customerName}>{order.customer_name}</div>
                        {order.customer_phone && (
                            <div className={styles.customerPhone}>{order.customer_phone}</div>
                        )}
                    </div>
                    <div className={styles.totalAmount}>₹{totalAmt}</div>
                </div>

                {/* Design + Quantity */}
                <div className={styles.designRow}>
                    <span className={styles.designName}>
                        {order.design_name || '—'}
                    </span>
                    <span className={styles.quantityBadge}>
                        {parseFloat(order.quantity_meters || 0).toFixed(1)} m
                    </span>
                </div>

                {/* Meta — due date, firm, job badges */}
                <div className={styles.metaRow}>
                    <span className={`${styles.dueDate} ${isOverdue ? styles.dueDateOverdue : ''}`}>
                        <Calendar size={11} />
                        {isOverdue ? `Overdue since ${dueDateStr}` : `Due ${dueDateStr}`}
                    </span>
                    {firmLabel && (
                        <span className={styles.firmBadge}>
                            <Building2 size={10} />
                            {firmLabel}
                        </span>
                    )}
                    {(order.job_costs?.length > 0 || order.embroidery_job_cost > 0 || order.dyeing_job_cost > 0) && (
                        <span className={styles.jobBadges}>
                            {(order.job_costs?.some((jc: any) => jc.type === 'embroidery') || order.embroidery_job_cost > 0) && (
                                <IntelligentChip type="embroidery" jobCosts={order.job_costs || []} orderId={order.id?.toString()} />
                            )}
                            {(order.job_costs?.some((jc: any) => jc.type === 'dyeing') || order.dyeing_job_cost > 0) && (
                                <IntelligentChip type="dyeing" jobCosts={order.job_costs || []} orderId={order.id?.toString()} />
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Footer: checkbox + action ── */}
            <div className={styles.cardFooter} onClick={e => e.stopPropagation()}>
                {eligible ? (
                    <div className={styles.checkboxWrapper}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={!!isSelected}
                            onChange={() => onToggleSelect?.(order.id)}
                        />
                    </div>
                ) : (
                    <div className={styles.checkboxPlaceholder} />
                )}

                {order.invoice_generated && (
                    <span className={styles.invoiceChip}>
                        <CheckCircle2 size={11} /> Invoiced
                    </span>
                )}

                <QuickActionButton
                    order={order}
                    onWorkflowAction={onWorkflowAction}
                    onGenerateInvoice={onGenerateInvoice}
                    setIsCompletePrintingModalOpen={setIsCompletePrintingModalOpen}
                    setSelectedOrderForPrinting={setSelectedOrderForPrinting}
                />
            </div>
        </div>
    );
}
