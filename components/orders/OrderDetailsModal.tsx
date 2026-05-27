'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Copy, Printer, Download, Archive, Calendar, User, 
    FileText, CheckCircle2, Clock, Package, Truck, History, 
    DollarSign, Activity, CreditCard, AlertCircle
} from 'lucide-react';
import styles from './OrderDetailsModal.module.css';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import SendToVendorModal from '@/components/orders/SendToVendorModal';
import { ProductionOutsourceSection, type ProcessType } from '@/components/orders/ProductionOutsourceCard';

interface OrderDetailsModalProps {
    orderId: string | number;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
    onEdit?: () => void;
}

const TABS = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'production', label: 'Production', icon: Activity },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'invoice', label: 'Invoice', icon: DollarSign },
    { id: 'history', label: 'History', icon: History }
];

export default function OrderDetailsModal({ orderId, isOpen, onClose, onUpdate, onEdit }: OrderDetailsModalProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && orderId) {
            fetchOrderData();
            fetchAuditLogs();
        } else {
            // reset state when closed
            setOrder(null);
            setLoading(true);
            setActiveTab('overview');
        }
    }, [isOpen, orderId]);

    const fetchOrderData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/orders/${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            }
        } catch (err) {
            console.error('Fetch order error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await fetch(`/api/audit-logs/entity?entity=order&entityId=${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Fetch logs error:', err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div 
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div 
                    className={styles.modalContainer}
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <h2 className={styles.headerTitle}>Order #{order?.order_number || orderId}</h2>
                            {order && (
                                <span className={styles.badge} style={{ background: '#fef08a', color: '#854d0e' }}>
                                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status}
                                </span>
                            )}
                            {order?.priority === 'urgent' && (
                                <span className={styles.badge} style={{ background: '#fee2e2', color: '#991b1b' }}>Urgent</span>
                            )}
                        </div>
                        <div className={styles.headerRight}>
                            <button className={styles.quickActionButton}><Copy size={14} /> Duplicate</button>
                            <button className={styles.quickActionButton}><Printer size={14} /> Print</button>
                            <button className={styles.quickActionButton}><Download size={14} /> PDF</button>
                            <button className={styles.closeButton} onClick={onClose}><X size={20} /></button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabBar}>
                        {TABS.map(tab => (
                            <button 
                                key={tab.id}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <tab.icon size={16} />
                                    {tab.label}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className={styles.contentArea}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading order details...</div>
                        ) : !order ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Order not found.</div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === 'overview' && <OverviewTab order={order} />}
                                    {activeTab === 'production' && <ProductionTab order={order} onUpdate={fetchOrderData} />}
                                    {activeTab === 'dispatch' && <DispatchTab order={order} />}
                                    {activeTab === 'invoice' && <InvoiceTab order={order} />}
                                    {activeTab === 'history' && <HistoryTab logs={auditLogs} />}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Footer */}
                                        <div className={styles.stickyFooter}>
                        {onEdit && <button className={styles.btnSecondary} onClick={() => { onClose(); onEdit(); }}>Edit Order</button>}
                        <button className={styles.btnSecondary} onClick={() => alert('Dispatch modal coming soon')}>Dispatch</button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

// --- TAB COMPONENTS ---

function OverviewTab({ order }: { order: any }) {
    const handleNotesSave = async (e: any) => {
        const val = e.target.value;
        if (val !== order.notes) {
            // Optimistic update would happen here. For now just fire API
            fetch(`/api/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ notes: val }) });
        }
    };

    return (
        <div className={styles.grid2Col}>
            <div className={styles.card}>
                <h3 className={styles.cardTitle}><User size={16} /> Customer Info</h3>
                <div className={styles.finRow}><span className={styles.finLabel}>Name</span><span className={styles.finValue}>{order.customer_name}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Phone</span><span className={styles.finValue}>{order.customer_phone || '-'}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>GST</span><span className={styles.finValue}>{order.customer_gst || '-'}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>City/State</span><span className={styles.finValue}>{order.customer_city || '-'}</span></div>
            </div>
            
            <div className={styles.card}>
                <h3 className={styles.cardTitle}><Package size={16} /> Design Info</h3>
                {order.design_image && (
                    <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', height: '120px' }}>
                        <img src={order.design_image} alt={order.design_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}
                <div className={styles.finRow}><span className={styles.finLabel}>Design</span><span className={styles.finValue}>{order.design_name || '-'}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Fabric</span><span className={styles.finValue}>{order.fabric_name}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Quantity</span><span className={styles.finValue}>{order.quantity_meters}m</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Rate</span><span className={styles.finValue}>₹{order.rate_per_meter}/m</span></div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}><DollarSign size={16} /> Order Financials</h3>
                <div className={styles.finRow}><span className={styles.finLabel}>Base Amount</span><span className={styles.finValue}>₹{Number(order.total_amount).toFixed(2)}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Embroidery Cost</span><span className={styles.finValue}>₹{Number(order.embroidery_cost || 0).toFixed(2)}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Dyeing Cost</span><span className={styles.finValue}>₹{Number(order.dyeing_cost || 0).toFixed(2)}</span></div>
                <div className={styles.finRow}><span className={styles.finLabel}>Transport Cost</span><span className={styles.finValue}>₹{Number(order.transport_cost || 0).toFixed(2)}</span></div>
                <div className={`${styles.finRow} ${styles.finTotal}`}><span className={styles.finLabel} style={{color: '#0f172a'}}>Grand Total</span><span className={styles.finValue}>₹{Number(order.grand_total || order.total_amount).toFixed(2)}</span></div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}><FileText size={16} /> Order Notes</h3>
                <textarea 
                    style={{ width: '100%', minHeight: '120px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }} 
                    defaultValue={order.notes || ''}
                    placeholder="Add notes here..."
                    onBlur={handleNotesSave}
                />
            </div>
        </div>
    );
}


function ProductionTab({ order, onUpdate }: { order: any, onUpdate: () => void }) {
    const steps = ['created', 'approved', 'embroidery', 'printing', 'dyeing', 'ready', 'dispatched', 'delivered'];
    const currentIdx = steps.indexOf(order.status) >= 0 ? steps.indexOf(order.status) : 0;
    const progressPercent = (currentIdx / (steps.length - 1)) * 100;

    const [showVendorModal, setShowVendorModal] = useState<ProcessType | null>(null);

    return (
        <div>
            {showVendorModal && (
                <SendToVendorModal
                    isOpen={true}
                    onClose={() => setShowVendorModal(null)}
                    onSuccess={() => { setShowVendorModal(null); onUpdate(); }}
                    orders={[order]}
                    action={`send_to_${showVendorModal}` as any}
                />
            )}

            {/* Workflow Tracker */}
            <div className={styles.card} style={{ marginBottom: '16px' }}>
                <h3 className={styles.cardTitle}><Activity size={16} /> Workflow Tracker</h3>
                <div className={styles.trackerContainer}>
                    <div className={styles.trackerLine} />
                    <div className={styles.trackerLineProgress} style={{ width: `${progressPercent}%` }} />
                    {steps.map((step, idx) => {
                        const isCompleted = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                            <div key={step} className={styles.trackerStep}>
                                <div className={`${styles.stepCircle} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}>
                                    {isCompleted ? <CheckCircle2 size={16} /> : <span style={{ fontSize: '12px' }}>{idx + 1}</span>}
                                </div>
                                <span className={`${styles.stepLabel} ${isCurrent ? styles.current : ''}`}>
                                    {ORDER_STATUS_LABELS[step as keyof typeof ORDER_STATUS_LABELS] || step}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Shared Outsource Section */}
            <ProductionOutsourceSection
                order={order}
                onUpdate={onUpdate}
                onSendToVendor={(type) => setShowVendorModal(type)}
            />
        </div>
    );
}

function DispatchTab({ order }: { order: any }) {
    return (
        <div className={styles.card}>
            <h3 className={styles.cardTitle}><Truck size={16} /> Dispatch Details</h3>
            {order.dispatch_status ? (
                <div>
                    <div className={styles.finRow}><span className={styles.finLabel}>Driver</span><span className={styles.finValue}>{order.driver_name || '-'}</span></div>
                    <div className={styles.finRow}><span className={styles.finLabel}>Vehicle</span><span className={styles.finValue}>{order.vehicle_number || '-'}</span></div>
                    <div className={styles.finRow}><span className={styles.finLabel}>Transport Cost</span><span className={styles.finValue}>₹{order.transport_cost || '0'}</span></div>
                    <button className={styles.btnSecondary} style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }} onClick={() => alert('Challan generation coming soon')}>View/Generate Challan</button>
                </div>
            ) : (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ marginBottom: '16px' }}>This order has not been dispatched yet.</p>
                    <button className={styles.btnPrimary} style={{ margin: '0 auto' }}>Create Dispatch</button>
                </div>
            )}
        </div>
    );
}

function InvoiceTab({ order }: { order: any }) {
    const isPaid = order.payment_status === 'paid';
    return (
        <div className={styles.card}>
            <h3 className={styles.cardTitle}><CreditCard size={16} /> Payment Status</h3>
            <div className={styles.progressWrapper}>
                <div className={styles.progressBar} style={{ width: isPaid ? '100%' : '0%' }} />
            </div>
            <div className={styles.finRow}>
                <span>Status: <strong style={{ color: isPaid ? '#10b981' : '#f59e0b' }}>{order.payment_status?.toUpperCase() || 'UNPAID'}</strong></span>
                <button className={styles.btnSecondary} style={{ padding: '4px 8px' }}>Record Payment</button>
            </div>
            <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>Invoices</h4>
                {order.invoices && order.invoices.length > 0 ? (
                    order.invoices.map((inv: any) => (
                        <div key={inv.id} className={styles.finRow} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 500, color: '#3b82f6' }}>{inv.invoice_number}</span>
                            <span style={{ color: '#64748b', fontSize: '13px' }}>{new Date(inv.created_at).toLocaleDateString()}</span>
                            <button className={styles.btnSecondary} style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => inv.pdf_url && window.open(inv.pdf_url)}>View PDF</button>
                        </div>
                    ))
                ) : (
                    <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '12px' }}>No invoices generated yet.</div>
                )}
            </div>
        </div>
    );
}

function HistoryTab({ logs }: { logs: any[] }) {
    return (
        <div className={styles.card}>
            <h3 className={styles.cardTitle}><History size={16} /> Activity Timeline</h3>
            <ActivityTimeline logs={logs} />
        </div>
    );
}
