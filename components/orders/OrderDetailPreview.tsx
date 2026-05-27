'use client';

import React, { useEffect, useState } from 'react';
import { 
    ShoppingBag, Calendar, User, FileText, CheckCircle2, Clock, Package, Truck, 
    TrendingUp, Scissors, Droplets, CreditCard, ShieldAlert, Loader2, AlertCircle, Phone
} from 'lucide-react';
import styles from './OrderDetailPreview.module.css';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

interface OrderDetailPreviewProps {
    orderId?: number;
    onUpdate: () => void;
    onGenerateInvoice: (order: any) => void;
}

const STEPS = [
    { key: ORDER_STATUSES.CREATED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CREATED] },
    { key: ORDER_STATUSES.APPROVED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.APPROVED] },
    { key: ORDER_STATUSES.EMBROIDERY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.EMBROIDERY] },
    { key: ORDER_STATUSES.PRINTING, label: ORDER_STATUS_LABELS[ORDER_STATUSES.PRINTING] },
    { key: ORDER_STATUSES.DYEING, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DYEING] },
    { key: ORDER_STATUSES.READY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.READY] },
    { key: ORDER_STATUSES.DISPATCHED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DISPATCHED] },
    { key: ORDER_STATUSES.DELIVERED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DELIVERED] }
];

export default function OrderDetailPreview({ orderId, onUpdate, onGenerateInvoice }: OrderDetailPreviewProps) {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);

    const fetchOrderDetails = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${id}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            }
        } catch (err) {
            console.error('Failed to fetch order preview details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails(orderId);
        } else {
            setOrder(null);
        }
    }, [orderId]);

    const handleWorkflowAction = async (action: string) => {
        if (!order || actionBusy) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                await fetchOrderDetails(order.id);
                onUpdate();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update workflow');
            }
        } catch (err) {
            console.error('Error in workflow transition:', err);
        } finally {
            setActionBusy(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (!order || actionBusy) return;
        
        // If already generated, open PDF
        if (order.invoices && order.invoices.length > 0 && order.invoices[0].pdf_url) {
            window.open(order.invoices[0].pdf_url, '_blank');
            return;
        }

        setActionBusy(true);
        try {
            const res = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, dueDays: 7 }),
            });
            if (res.ok) {
                await fetchOrderDetails(order.id);
                onUpdate();
            } else {
                alert('Failed to generate invoice');
            }
        } catch (err) {
            console.error('Error generating invoice:', err);
        } finally {
            setActionBusy(false);
        }
    };

    if (!orderId) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                    <ShoppingBag size={36} />
                </div>
                <h3>Select an Order</h3>
                <p>Tap on any order card or row in the workspace to view live production details, margins, and persistent workflow triggers.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinner} size={28} />
                <p>Loading order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className={styles.errorContainer}>
                <AlertCircle size={28} className={styles.errorIcon} />
                <p>Failed to retrieve details for order #{orderId}</p>
            </div>
        );
    }

    const status = order.status?.toLowerCase() || ORDER_STATUSES.CREATED;
    const currentStepIndex = STEPS.findIndex(s => s.key === status);

    const orderValue = order.total_price || 0;
    const fabricCost = order.fabric_purchase_cost || 0;

    // manual job costs
    const embroideryEntries = order.jobCosts?.filter((j: any) => j.type === 'embroidery') || [];
    const dyeingEntries = order.jobCosts?.filter((j: any) => j.type === 'dyeing') || [];

    // vendor dispatch records
    const embroideryDispatches = order.vendorDispatches?.filter((d: any) => d.process_type === 'embroidery') || [];
    const dyeingDispatches = order.vendorDispatches?.filter((d: any) => d.process_type === 'dyeing') || [];

    // totals
    const embroideryCost = order.outsourcingTotals?.embroidery ?? (
        embroideryEntries.reduce((s: number, j: any) => s + parseFloat(j.total_cost || 0), 0) +
        embroideryDispatches.reduce((s: number, d: any) => s + parseFloat(d.total_cost || 0), 0)
    );
    const dyeingCost = order.outsourcingTotals?.dyeing ?? (
        dyeingEntries.reduce((s: number, j: any) => s + parseFloat(j.total_cost || 0), 0) +
        dyeingDispatches.reduce((s: number, d: any) => s + parseFloat(d.total_cost || 0), 0)
    );

    const grossProfit = orderValue - embroideryCost - dyeingCost - fabricCost;
    const marginPercent = orderValue > 0 ? (grossProfit / orderValue) * 100 : 0;

    return (
        <div className={styles.previewCard}>
            {/* Header section */}
            <div className={styles.header}>
                <div>
                    <div className={styles.idBadge}>Order #{order.order_number || order.id}</div>
                    <h2 className={styles.customerName}>{order.customer_name}</h2>
                    <div className={styles.phoneRow}>
                        <Phone size={12} />
                        <span>{order.customer_phone}</span>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    {status === ORDER_STATUSES.CREATED && (
                        <button className={styles.btnApprove} onClick={() => handleWorkflowAction('approve')} disabled={actionBusy}>
                            {actionBusy ? 'Processing...' : 'Approve'}
                        </button>
                    )}
                    {status === ORDER_STATUSES.EMBROIDERY && order.embroidery_status === 'in_progress' && (
                        <button className={styles.btnApprove} onClick={() => handleWorkflowAction('complete_printing')} disabled={actionBusy}>
                            {actionBusy ? 'Processing...' : 'Complete Printing'}
                        </button>
                    )}
                    {status === ORDER_STATUSES.DYEING && order.dyeing_status === 'in_progress' && (
                        <button className={styles.btnApprove} onClick={() => handleWorkflowAction('mark_ready')} disabled={actionBusy}>
                            {actionBusy ? 'Processing...' : 'Mark Ready'}
                        </button>
                    )}
                    {status === ORDER_STATUSES.DELIVERED && !order.invoice_generated && (
                        <button className={styles.btnInvoice} onClick={handleGenerateInvoice} disabled={actionBusy}>
                            {actionBusy ? 'Generating...' : 'Generate Invoice'}
                        </button>
                    )}
                    {order.invoice_generated && (
                        <button className={styles.btnInvoiced} onClick={handleGenerateInvoice}>
                            <FileText size={14} /> View Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className={styles.timelineSection}>
                <h4 className={styles.sectionTitle}>Production Timeline</h4>
                <div className={styles.timelineTrack}>
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isActive = idx === currentStepIndex;
                        return (
                            <div key={step.key} className={`${styles.step} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''}`}>
                                <div className={styles.stepDot}>
                                    {isCompleted ? <CheckCircle2 size={12} /> : <span>{idx + 1}</span>}
                                </div>
                                <span className={styles.stepLabel}>{step.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content grid */}
            <div className={styles.contentGrid}>
                {/* Details summary card */}
                <div className={styles.card}>
                    <h4 className={styles.cardTitle}><ShoppingBag size={14} /> Specifications</h4>
                    <div className={styles.specsList}>
                        <div className={styles.specRow}>
                            <span>Design Name:</span>
                            <strong>{order.design_name || 'Custom Design'}</strong>
                        </div>
                        <div className={styles.specRow}>
                            <span>Meters Ordered:</span>
                            <strong>{order.quantity_meters} m</strong>
                        </div>
                        <div className={styles.specRow}>
                            <span>Fabric Base:</span>
                            <strong>{order.fabric_type || 'Viscose'}</strong>
                        </div>
                        <div className={styles.specRow}>
                            <span>Total Fabric Value:</span>
                            <strong>₹{(order.quantity_meters * order.rate_per_meter).toLocaleString('en-IN')}</strong>
                        </div>
                    </div>
                </div>

                {/* Profit margins card */}
                <div className={styles.card}>
                    <h4 className={styles.cardTitle}><TrendingUp size={14} /> Gross Profit Analysis</h4>
                    <div className={styles.specsList}>
                        <div className={styles.specRow}>
                            <span>Fabric Cost:</span>
                            <span>₹{fabricCost.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.specRow}>
                            <span>Embroidery Outsource:</span>
                            <span>₹{embroideryCost.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.specRow}>
                            <span>Dyeing Outsource:</span>
                            <span>₹{dyeingCost.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.divider} />
                        <div className={styles.specRow} style={{ color: grossProfit >= 0 ? '#16A34A' : '#EF4444', fontWeight: 700 }}>
                            <span>Projected Margin:</span>
                            <span>₹{grossProfit.toLocaleString('en-IN')} ({marginPercent.toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>

                {/* Outsource status records */}
                {(embroideryDispatches.length > 0 || dyeingDispatches.length > 0) && (
                    <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
                        <h4 className={styles.cardTitle}><Truck size={14} /> Vendor Outsourcing Dispatches</h4>
                        <div className={styles.dispatchesList}>
                            {embroideryDispatches.map((d: any) => (
                                <div key={d.id} className={styles.dispatchRow}>
                                    <div className={styles.dispatchTitle}>
                                        <Scissors size={12} color="#FF9500" />
                                        <strong>Embroidery: {d.vendor_name}</strong>
                                    </div>
                                    <div className={styles.dispatchMeta}>
                                        <span>{parseFloat(d.total_meters || 0).toFixed(1)}m @ ₹{d.rate_per_meter}/m</span>
                                        <strong>₹{parseFloat(d.total_cost || 0).toLocaleString('en-IN')}</strong>
                                        <span className={styles.statusPill}>{d.status}</span>
                                    </div>
                                </div>
                            ))}
                            {dyeingDispatches.map((d: any) => (
                                <div key={d.id} className={styles.dispatchRow}>
                                    <div className={styles.dispatchTitle}>
                                        <Droplets size={12} color="#0071E3" />
                                        <strong>Dyeing: {d.vendor_name}</strong>
                                    </div>
                                    <div className={styles.dispatchMeta}>
                                        <span>{parseFloat(d.total_meters || 0).toFixed(1)}m @ ₹{d.rate_per_meter}/m</span>
                                        <strong>₹{parseFloat(d.total_cost || 0).toLocaleString('en-IN')}</strong>
                                        <span className={styles.statusPill}>{d.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
