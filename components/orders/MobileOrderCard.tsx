'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    MoreHorizontal, Eye, Edit2, FileText, Trash2,
    AlertTriangle, QrCode, MessageCircle, CheckCircle2,
    Scissors, Droplets, Package, Truck, Check
} from 'lucide-react';
import { createPortal } from 'react-dom';
import styles from './MobileOrderCard.module.css';

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

function getStageBadgeLabel(order: any): string {
    const stage = order.order_stage || 'order_added';
    const map: Record<string, string> = {
        order_added:      'APPROVAL',
        approved:         'APPROVED',
        embroidery:       'EMBROIDERY',
        printing:         'PRINTING',
        dyeing:           'DYEING',
        ready:            'READY',
        out_for_delivery: 'OUT FOR DELIVERY',
        delivered:        'DELIVERED',
    };
    return map[stage] || stage.toUpperCase();
}

function getStageBadgeCss(order: any, isOverdue: boolean): string {
    if (isOverdue) return styles.badgeOverdue;
    const stage = order.order_stage || 'order_added';
    
    if (stage === 'order_added' || stage === 'approved') {
        return styles.badgeApproval;
    }
    if (stage === 'embroidery' || stage === 'printing') {
        return styles.badgeEmbroidery;
    }
    if (stage === 'dyeing') {
        return styles.badgeDyeing;
    }
    if (stage === 'ready' || stage === 'out_for_delivery') {
        return styles.badgeReady;
    }
    if (stage === 'delivered') return styles.badgeDelivered;
    return styles.badgeApproval;
}

function getStageBorderColor(order: any, isOverdue: boolean): string {
    if (isOverdue) return '#FF3B30';
    const stage = order.order_stage || 'order_added';
    if (stage === 'order_added' || stage === 'approved') return '#FF9500';
    if (stage === 'embroidery' || stage === 'printing') return '#AF52DE';
    if (stage === 'dyeing') return '#0071E3';
    if (stage === 'ready' || stage === 'out_for_delivery') return '#34C759';
    if (stage === 'delivered') return '#8E8E93';
    return 'transparent';
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

    const handleShareOrderWhatsApp = async (orderId: number, type: 'summary' | 'dispatch' | 'tracking') => {
        try {
            const res = await fetch(`/api/orders/${orderId}/share-details`);
            if (!res.ok) {
                alert('Failed to retrieve order details for sharing');
                return;
            }
            const data = await res.json();
            let message = '';
            if (type === 'summary') message = data.summaryMessage;
            else if (type === 'dispatch') message = data.dispatchMessage;
            else if (type === 'tracking') message = data.trackingMessage;

            window.open(`https://wa.me/${data.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        } catch (err) {
            console.error('Error sharing order via WhatsApp:', err);
        }
    };

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
        <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
                <MoreHorizontal size={16} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                    borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 500, padding: '4px', minWidth: '180px',
                }}>
                    {[
                        { label: 'View Details', icon: <Eye size={13} />, action: () => router.push(`/orders/${order.id}`) },
                        { label: 'Edit Order',   icon: <Edit2 size={13} />, action: () => onEdit?.(order) },
                        !order.invoice_generated && { label: 'Generate Invoice', icon: <FileText size={13} />, action: () => onGenerateInvoice(order), color: '#34C759' },
                        { label: 'Print QR Label', icon: <QrCode size={13} />, action: () => {} },
                        { separator: true },
                        { label: 'Share Summary', icon: <MessageCircle size={13} />, action: () => handleShareOrderWhatsApp(order.id, 'summary'), color: '#25D366' },
                        { label: 'Share Dispatch', icon: <MessageCircle size={13} />, action: () => handleShareOrderWhatsApp(order.id, 'dispatch'), color: '#25D366' },
                        { label: 'Share Tracking', icon: <MessageCircle size={13} />, action: () => handleShareOrderWhatsApp(order.id, 'tracking'), color: '#25D366' },
                        { separator: true },
                        { label: 'Delete Order', icon: <Trash2 size={13} />, action: () => { setOpen(false); setConfirmDelete(true); }, color: '#FF3B30' },
                    ].filter(Boolean).map((item: any, i) =>
                        item.separator
                            ? <div key={i} style={{ height: 1, background: 'var(--border-primary)', margin: '3px 4px' }} />
                            : (
                                <button key={i} onClick={(e) => { e.stopPropagation(); item.action(); setOpen(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                    padding: '7px 10px', background: 'transparent', border: 'none',
                                    borderRadius: '6px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer',
                                    color: item.color || 'var(--text-primary)', textAlign: 'left',
                                    fontFamily: 'inherit'
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
                        background: 'var(--bg-card)', borderRadius: '16px', padding: '24px',
                        maxWidth: '340px', width: '90%', boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
                        textAlign: 'center',
                    }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                            <AlertTriangle size={20} color="#FF3B30" />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Delete Order?</h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.45 }}>
                            Order <strong>{order.order_number || `#${order.id}`}</strong> will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: 38, borderRadius: '10px', border: '1px solid var(--border-primary)', background: 'var(--bg-grouped)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, height: 38, borderRadius: '10px', border: 'none', background: '#FF3B30', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: deleting ? 0.7 : 1 }}>
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
    selectedOrderId?: number;
    onSelectOrder?: (id: number) => void;
    isSelectionModeActive?: boolean;
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
    selectedOrderId,
    onSelectOrder,
    isSelectionModeActive,
}: MobileOrderCardProps) {
    const router = useRouter();

    const now = Math.floor(Date.now() / 1000);
    const effectiveDate = order.order_date || order.created_at;
    const deliveryDeadline = effectiveDate + 7 * 24 * 60 * 60;
    const stage = order.order_stage || 'order_added';
    const isFinished = stage === 'delivered';
    const isOverdue = !isFinished && now > deliveryDeadline;

    const eligible = isEligibleForBulkAction(order);

    // Due date display
    const dueDate = new Date(deliveryDeadline * 1000);
    const dueDateStr = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    // Amount
    const totalAmt = parseFloat(order.total_price || 0).toLocaleString('en-IN');

    const renderMobileActionButton = () => {
        const embStatus = order.embroidery_status;
        const printStatus = order.printing_status;
        const dyeStatus = order.dyeing_status;

        if (stage === 'order_added') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnApprove}`}
                    onClick={(e) => { e.stopPropagation(); onWorkflowAction('approve', order); }}
                >
                    <CheckCircle2 size={13} />
                    <span>Approve</span>
                </button>
            );
        }
        if (stage === 'approved') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnEmbroidery}`}
                    onClick={(e) => { e.stopPropagation(); onWorkflowAction('send_to_embroidery', order); }}
                >
                    <Scissors size={13} />
                    <span>Embroidery</span>
                </button>
            );
        }
        if (stage === 'embroidery' && embStatus === 'queued_delivery') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnDisabled}`}
                    disabled
                >
                    <Truck size={13} />
                    <span>Queued</span>
                </button>
            );
        }
        if (stage === 'embroidery' && embStatus === 'in_progress') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnPrinting}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderForPrinting(order);
                        setIsCompletePrintingModalOpen(true);
                    }}
                >
                    <Package size={13} />
                    <span>Printing</span>
                </button>
            );
        }
        if (stage === 'printing' && printStatus === 'in_progress') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnDyeing}`}
                    onClick={(e) => { e.stopPropagation(); onWorkflowAction('send_to_dyeing', order); }}
                >
                    <Droplets size={13} />
                    <span>Dyeing</span>
                </button>
            );
        }
        if (stage === 'dyeing' && dyeStatus === 'queued_delivery') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnDisabled}`}
                    disabled
                >
                    <Truck size={13} />
                    <span>Queued</span>
                </button>
            );
        }
        if (stage === 'dyeing' && dyeStatus === 'in_progress') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnReady}`}
                    onClick={(e) => { e.stopPropagation(); onWorkflowAction('mark_ready', order); }}
                >
                    <Check size={13} />
                    <span>Ready</span>
                </button>
            );
        }
        if (stage === 'ready') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnDispatch}`}
                    onClick={(e) => { e.stopPropagation(); onWorkflowAction('dispatch', order); }}
                >
                    <Truck size={13} />
                    <span>Dispatch</span>
                </button>
            );
        }
        if (stage === 'out_for_delivery') {
            return (
                <button
                    className={`${styles.actionBtn} ${styles.btnDeliver}`}
                    onClick={(e) => { e.stopPropagation(); onWorkflowAction('mark_delivered', order); }}
                >
                    <CheckCircle2 size={13} />
                    <span>Deliver</span>
                </button>
            );
        }
        if (stage === 'delivered') {
            return (
                <div className={`${styles.actionBtn} ${styles.btnDelivered}`}>
                    <Check size={13} />
                    <span>Delivered</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div
            className={`${styles.card} ${selectedOrderId === order.id ? styles.cardActive : ''}`}
            style={{ borderLeftColor: getStageBorderColor(order, isOverdue) }}
            onClick={(e) => {
                if (onSelectOrder) {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectOrder(order.id);
                } else {
                    router.push(`/orders/${order.id}`);
                }
            }}
        >
            {/* ── TOP: Status Badge, Amount & Overflow Menu ── */}
            <div className={styles.topRow}>
                <span className={`${styles.statusPill} ${getStageBadgeCss(order, isOverdue)}`}>
                    {isOverdue ? 'OVERDUE' : getStageBadgeLabel(order)}
                </span>
                <div className={styles.topRight} onClick={e => e.stopPropagation()}>
                    <span className={styles.amount}>₹{totalAmt}</span>
                    <CardMenu
                        order={order}
                        onGenerateInvoice={onGenerateInvoice}
                        onEdit={onEdit}
                        onUpdate={onUpdate}
                    />
                </div>
            </div>

            {/* ── MIDDLE: Customer Name & Design Name ── */}
            <div className={styles.middleSection}>
                <div className={styles.customerRow}>
                    <span className={styles.customerName}>{order.customer_name}</span>
                    {order.is_recurring && <span className={styles.recurringIcon} title="Recurring">↻</span>}
                </div>
                <div className={styles.designRow}>
                    <span className={styles.designName}>{order.design_name || '—'}</span>
                </div>
            </div>

            {/* ── BOTTOM: Specifications ── */}
            <div className={styles.bottomRow} onClick={e => e.stopPropagation()}>
                <div className={styles.bottomLeft}>
                    {eligible && onToggleSelect && (
                        <div className={styles.checkboxWrapper}>
                            <input
                                type="checkbox"
                                className={styles.massiveCheckbox}
                                checked={!!isSelected}
                                onChange={() => onToggleSelect?.(order.id)}
                            />
                        </div>
                    )}
                    <span className={styles.specsText}>
                        {parseFloat(order.quantity_meters || 0).toFixed(0)}m • Due {dueDateStr} • {order.order_number || `ORD-${order.id}`}
                    </span>
                    {order.invoice_generated && (
                        <span className={styles.invoiceChip}>
                            Invoiced
                        </span>
                    )}
                </div>
            </div>

            {/* ── ACTION PILL: Full width at the bottom ── */}
            <div className={styles.actionRow} style={{ opacity: isSelectionModeActive ? 0.3 : 1, pointerEvents: isSelectionModeActive ? 'none' : 'auto' }} onClick={e => e.stopPropagation()}>
                {renderMobileActionButton()}
            </div>
        </div>
    );
}
