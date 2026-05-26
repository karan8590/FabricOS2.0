'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, ShoppingBag, Calendar, User, Settings2, FileText, 
    CheckCircle2, Clock, Package, Truck, History, DollarSign, 
    AlertCircle, Smartphone, Send, Printer, MoreVertical, ArrowRight,
    Activity, ShieldAlert, CreditCard, Scissors, Droplets, Plus, 
    Trash2, Edit3, X, TrendingUp, ChevronDown
} from 'lucide-react';
import styles from './OrderDetails.module.css';
import PaymentModal from '@/components/invoices/PaymentModal';
import GenerateChallanModal from '@/components/challans/GenerateChallanModal';
import ProductionWorkflowModal from '@/components/orders/ProductionWorkflowModal';
import ProductionActionButton from '@/components/orders/ProductionActionButton';
import ActivityTimeline from '@/components/ui/ActivityTimeline';

import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

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

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [confirmAction, setConfirmAction] = useState<string | null>(null);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const [challanModalState, setChallanModalState] = useState<{ isOpen: boolean; type: 'dispatch'|'jobwork'; linkedData?: any }>({ isOpen: false, type: 'dispatch' });
    const [workflowModalState, setWorkflowModalState] = useState<{isOpen: boolean, action: 'send_to_embroidery' | 'send_to_dyeing'}>({isOpen: false, action: 'send_to_embroidery'});

    const [vendorsList, setVendorsList] = useState<any[]>([]);

    // Audit Timeline
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    
    // Accordion UI State for Job Costs
    const [addingCostFor, setAddingCostFor] = useState<string | null>(null); // 'embroidery' | 'dyeing'

    // Inline form state
    const [vendorId, setVendorId] = useState<string>('');
    const [isAddNewVendor, setIsAddNewVendor] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');
    const [newVendorPhone, setNewVendorPhone] = useState('');
    
    const [metres, setMetres] = useState<number>(0);
    const [rate, setRate] = useState<number | ''>('');
    const [date, setDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [reference, setReference] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // GST Fields for Job Costs
    const [hasGst, setHasGst] = useState(false);
    const [gstRate, setGstRate] = useState('5');
    const [itcClaimed, setItcClaimed] = useState(false);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${params.id}`);
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

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors');
            if (res.ok) {
                const data = await res.json();
                setVendorsList(data.vendors || []);
            }
        } catch (err) {
            console.error('Fetch vendors error:', err);
        }
    };

    useEffect(() => {
        fetchOrder();
        fetchVendors();
        fetchAuditLogs();
    }, [params.id]);

    const fetchAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const res = await fetch(`/api/audit-logs/entity?entity=order&entityId=${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Fetch audit logs error:', err);
        } finally {
            setAuditLoading(false);
        }
    };

    const handleSavePayment = async (data: { amount: number; date: string; notes: string }) => {
        if (!selectedInvoice) return;
        try {
            const res = await fetch(`/api/invoices/${selectedInvoice.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: data.amount, 
                    method: 'Cash', 
                    date: data.date, 
                    notes: data.notes 
                })
            });
            if (res.ok) {
                fetchOrder(); // refresh order details
            } else {
                console.log('Failed to record payment');
            }
        } catch (error) {
            console.log('Error recording payment');
        }
        setIsPaymentModalOpen(false);
    };

    const handlePrintSlip = () => {
        window.print();
    };

    const [generatingInvoice, setGeneratingInvoice] = useState(false);
    const handleGenerateInvoice = async () => {
        if (order?.invoices?.length > 0 && order.invoices[0].pdf_url) {
            window.open(order.invoices[0].pdf_url, '_blank');
            return;
        }
        
        
        
        setGeneratingInvoice(true);
        try {
            const res = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: params.id, dueDays: 7 })
            });
            if (res.ok) {
                const data = await res.json();
                fetchOrder();
                if (data.pdfUrl) window.open(data.pdfUrl, '_blank');
            } else {
                console.log('Failed to generate invoice');
            }
        } catch (err) {
            console.log('Error generating invoice');
        }
        setGeneratingInvoice(false);
        setGeneratingInvoice(false);
    };

    const handleSaveRecurring = async (active: boolean) => {
        try {
            const res = await fetch(`/api/orders/${params.id}/recurring`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recurring_active: active })
            });
            if (res.ok) {
                fetchOrder();
            } else console.log('Failed to update recurring settings');
        } catch (err) {
            console.log('Error updating recurring settings');
        }
    };

    const handleWorkflowTransition = async (action: string) => {
        try {
            const res = await fetch(`/api/orders/${params.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                fetchOrder();
                setConfirmAction(null);
            } else console.log('Failed to update workflow');
        } catch (err) {
            console.log('Error updating workflow');
        }
    };
    
    const handleStatusChange = async (newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${params.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchOrder();
            else console.log('Failed to update order status');
        } catch (err) {
            console.log('Error updating status');
        }
    };

    const handleOpenPaymentModal = () => {
        if (order?.invoices?.length > 0) {
            // Pick first unpaid invoice or latest
            const unpaid = order.invoices.find((i: any) => i.status !== 'paid') || order.invoices[0];
            setSelectedInvoice(unpaid);
            setIsPaymentModalOpen(true);
        } else {
            console.log('Please generate an invoice first before recording a payment.');
        }
    };

    const handleOpenInlineForm = (type: 'embroidery' | 'dyeing') => {
        if (addingCostFor === type) {
            setAddingCostFor(null);
            return;
        }
        setAddingCostFor(type);
        
        // Prefill
        setMetres(order?.quantity_meters || 0);
        setRate('');
        setDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
        setPaymentMode('Cash');
        setReference('');
        setPaymentStatus('unpaid');
        setNotes('');
        setVendorId('');
        setIsAddNewVendor(false);
        setHasGst(false);
        setGstRate('5');
        setItcClaimed(false);
    };

    const handleSaveJobCost = async () => {
        if (submitting || !addingCostFor) return;

        const currentRate = rate === '' ? 0 : rate;

        let activeVendorId = vendorId;

        if (isAddNewVendor) {
            if (!newVendorName || !newVendorPhone) {
                console.log('Please fill in new vendor name and phone number.');
                return;
            }
        } else {
            if (!activeVendorId) {
                console.log('Please select an external vendor.');
                return;
            }
        }

        if (metres <= 0 || currentRate <= 0) {
            console.log('Metres and Rate per metre must be greater than zero.');
            return;
        }

        const totalCalculated = metres * currentRate;

        try {
            setSubmitting(true);

            if (isAddNewVendor) {
                const targetType = addingCostFor === 'embroidery' ? 'Embroidery Work Vendor' : 'Dyeing Work Vendor';
                const vendorRes = await fetch('/api/vendors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newVendorName,
                        contact: newVendorPhone,
                        materialSupplied: `Outsourcing services for ${addingCostFor}`,
                        balance: 0,
                        vendorType: targetType
                    })
                });
                if (!vendorRes.ok) throw new Error('Failed to create new vendor inline');
                const vendorData = await vendorRes.json();
                activeVendorId = vendorData.vendorId.toString();
            }

            const payload = {
                type: addingCostFor,
                vendor_id: parseInt(activeVendorId),
                metres,
                rate_per_metre: currentRate,
                total_cost: totalCalculated,
                date,
                due_date: dueDate,
                payment_mode: paymentMode,
                reference,
                status: paymentStatus,
                notes,
                has_gst: hasGst,
                gst_rate: parseFloat(gstRate),
                itc_claimed: itcClaimed
            };

            const res = await fetch(`/api/orders/${params.id}/job-costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setAddingCostFor(null);
                fetchOrder();
            } else {
                const errorData = await res.json();
                console.log(errorData.error || 'Failed to save job cost');
            }
        } catch (err) {
            console.error('Save job cost error:', err);
            console.log('An unexpected error occurred while saving the job cost.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteJobCost = async (costId: number) => {
        
        try {
            const res = await fetch(`/api/orders/${params.id}/job-costs?costId=${costId}`, { method: 'DELETE' });
            if (res.ok) fetchOrder();
            else console.log('Failed to delete job cost.');
        } catch (err) {
            console.error('Delete job cost error:', err);
        }
    };

    const renderConfirmModal = () => {
        if (!confirmAction) return null;
        
        const isApprove = confirmAction === 'approve';
        const isDispatch = confirmAction === 'dispatch';
        const isComplete = confirmAction === 'mark_delivered';
        const isPrinting = confirmAction === 'mark_printing';
        const isReady = confirmAction === 'mark_ready';
        
        let iconColor = '#8E8E93';
        let iconBg = 'rgba(142, 142, 147, 0.12)';
        let btnBg = '#8E8E93';
        let btnTextColor = '#FFFFFF';
        let btnText = 'Confirm';
        let titleText = 'Confirm Action';
        let msgText = `Are you sure you want to proceed?`;

        if (isApprove) {
            iconColor = '#FFCC00';
            iconBg = 'rgba(255, 204, 0, 0.12)';
            btnBg = '#FFCC00';
            btnTextColor = '#000000';
            btnText = 'Approve';
            titleText = 'Approve Order?';
            msgText = `Are you sure you want to approve Order #${order?.order_number || order?.id}? This will move it to production.`;
        } else if (isPrinting) {
            iconColor = '#AF52DE';
            iconBg = 'rgba(175, 82, 222, 0.12)';
            btnBg = '#AF52DE';
            btnTextColor = '#FFFFFF';
            btnText = 'Mark Printing';
            titleText = 'Mark Printing Ready?';
            msgText = `Are you sure you want to mark Order #${order?.order_number || order?.id} as printing ready?`;
        } else if (isReady) {
            iconColor = '#34C759';
            iconBg = 'rgba(52, 199, 89, 0.12)';
            btnBg = '#34C759';
            btnTextColor = '#FFFFFF';
            btnText = 'Mark Ready';
            titleText = 'Mark as Ready?';
            msgText = `Are you sure you want to mark Order #${order?.order_number || order?.id} as ready for dispatch?`;
        } else if (isDispatch) {
            iconColor = '#3B82F6';
            iconBg = 'rgba(59, 130, 246, 0.12)';
            btnBg = '#3B82F6';
            btnTextColor = '#FFFFFF';
            btnText = 'Dispatch';
            titleText = 'Dispatch Order?';
            msgText = `Are you sure you want to dispatch Order #${order?.order_number || order?.id}?`;
        } else if (isComplete) {
            iconColor = '#34C759';
            iconBg = 'rgba(52, 199, 89, 0.12)';
            btnBg = '#34C759';
            btnTextColor = '#FFFFFF';
            btnText = 'Mark Delivered';
            titleText = 'Mark as Delivered?';
            msgText = `Are you sure you want to mark Order #${order?.order_number || order?.id} as delivered?`;
        }
        
        return (
            <div className="global-modal-overlay" onClick={() => setConfirmAction(null)}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <div className={styles.modalIcon} style={{ background: iconBg, color: iconColor }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className={styles.modalTitle}>{titleText}</h3>
                    <p className={styles.modalText}>{msgText}</p>
                    <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={() => setConfirmAction(null)}>
                            Cancel
                        </button>
                        <button 
                            className={styles.primaryActionBtn} 
                            style={{ 
                                padding: '12px 24px', 
                                background: btnBg, 
                                color: btnTextColor, 
                                borderRadius: '8px',
                                border: 'none',
                                justifyContent: 'center',
                                fontSize: '14px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                flex: 1
                            }}
                            onClick={async () => {
                                handleWorkflowTransition(confirmAction!);
                            }} 
                        >
                            {btnText}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className={styles.loading}>Loading order control center...</div>;
    if (!order) return <div className={styles.error}>Order not found.</div>;

    const status = order.status?.toLowerCase() || ORDER_STATUSES.CREATED;
    const currentStepIndex = STEPS.findIndex(s => s.key === status);

    const orderValue = order.total_price || 0;
    const embroideryCost = order.embroidery_job_cost || 0;
    const dyeingCost = order.dyeing_job_cost || 0;
    const fabricCost = order.fabric_purchase_cost || 0;
    const grossProfit = orderValue - embroideryCost - dyeingCost - fabricCost;
    const marginPercent = orderValue > 0 ? (grossProfit / orderValue) * 100 : 0;

    const embroideryEntries = order.jobCosts?.filter((j: any) => j.type === 'embroidery') || [];
    const dyeingEntries = order.jobCosts?.filter((j: any) => j.type === 'dyeing') || [];

    const totalEmbroidery = embroideryEntries.reduce((sum: number, j: any) => sum + j.total_cost, 0);
    const totalDyeing = dyeingEntries.reduce((sum: number, j: any) => sum + j.total_cost, 0);

    const getFilteredVendors = (type: string) => [...vendorsList].sort((a, b) => {
        const typeMatch = type === 'embroidery' ? 'Embroidery' : 'Dyeing';
        const aMatch = a.vendor_type?.includes(typeMatch);
        const bMatch = b.vendor_type?.includes(typeMatch);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
    });

    const renderInlineForm = (type: 'embroidery' | 'dyeing') => (
        <div className={styles.inlineForm}>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Vendor</label>
                    {!isAddNewVendor ? (
                        <select className={styles.formSelect} value={vendorId} onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                                setIsAddNewVendor(true); setVendorId('');
                            } else setVendorId(e.target.value);
                        }}>
                            <option value="">Select Vendor...</option>
                            {getFilteredVendors(type).map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                            <option value="__add_new__" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+ Add New Vendor</option>
                        </select>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="text" className={styles.formInput} placeholder="Vendor Name" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} />
                            <button type="button" className={styles.iconButton} onClick={() => setIsAddNewVendor(false)}><X size={16}/></button>
                        </div>
                    )}
                </div>
                {isAddNewVendor && (
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Vendor Phone</label>
                        <input type="text" className={styles.formInput} placeholder="Phone Number" value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} />
                    </div>
                )}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Metres</label>
                    <input type="number" className={styles.formInput} value={metres} onChange={(e) => setMetres(parseFloat(e.target.value) || 0)} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Rate / m</label>
                    <input type="number" className={styles.formInput} value={rate} onChange={(e) => setRate(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
                
                <div className={styles.autoTotal}>
                    <span className={styles.autoTotalLabel}>AUTO TOTAL</span>
                    <span className={styles.autoTotalValue}>₹{(metres * (rate === '' ? 0 : rate)).toLocaleString('en-IN')}</span>
                </div>

                {/* GST Fields */}
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={hasGst}
                            onChange={(e) => setHasGst(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
                        />
                        This job work includes GST / Tax Invoice
                    </label>
                </div>
                {hasGst && (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>GST Rate</label>
                            <select className={styles.formSelect} value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                        <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={itcClaimed}
                                    onChange={(e) => setItcClaimed(e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
                                />
                                Claim Input Tax Credit (ITC)
                            </label>
                        </div>
                    </>
                )}
            </div>
            
            <div className={styles.formActions}>
                <button className={styles.btnSecondary} onClick={() => setAddingCostFor(null)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={handleSaveJobCost} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Cost'}
                </button>
            </div>
        </div>
    );

    return (
        <div className={`${styles.container} ${styles[`status_${status.replace(' ', '')}`]}`}>
            <ProductionWorkflowModal 
                isOpen={workflowModalState.isOpen}
                onClose={() => setWorkflowModalState(prev => ({ ...prev, isOpen: false }))}
                onSuccess={() => {
                    setWorkflowModalState(prev => ({ ...prev, isOpen: false }));
                    fetchOrder();
                }}
                order={order}
                action={workflowModalState.action}
            />
            {/* Header Section */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ChevronLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div className={styles.titleGroup}>
                        <div className={styles.idBadge}>Order #{order.order_number || order.id}</div>
                        <h1 className={styles.title}>{order.customer_name}</h1>
                        <div className={styles.metaRow}>
                            <span className={styles.metaItem}><Calendar size={14} /> {new Date((order.order_date || order.created_at) * 1000).toLocaleDateString()}</span>
                            <span className={styles.metaItem}><User size={14} /> Admin</span>
                            <span className={styles.priorityHigh}><ShieldAlert size={14} /> High Priority</span>
                        </div>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <button className={styles.btnSecondary} onClick={handlePrintSlip}><Printer size={16} /> Print Slip</button>
                    <button className={styles.btnSecondary} onClick={handleGenerateInvoice} disabled={generatingInvoice}>
                        <FileText size={16} /> {generatingInvoice ? 'Generating...' : 'Invoice'}
                    </button>
                    {status === ORDER_STATUSES.CREATED && <ProductionActionButton themeColor="orange" label="Approve" onClick={() => setConfirmAction('approve')} />}
                    {status === ORDER_STATUSES.APPROVED && <ProductionActionButton themeColor="blue" label="Send to Embroidery" onClick={() => setWorkflowModalState({ isOpen: true, action: 'send_to_embroidery' })} />}
                    {status === ORDER_STATUSES.EMBROIDERY && <ProductionActionButton themeColor="purple" label="Mark Printing" onClick={() => setConfirmAction('mark_printing')} />}
                    {status === ORDER_STATUSES.PRINTING && <ProductionActionButton themeColor="cyan" label="Send to Dyeing" onClick={() => setWorkflowModalState({ isOpen: true, action: 'send_to_dyeing' })} />}
                    {status === ORDER_STATUSES.DYEING && <ProductionActionButton themeColor="green" label="Mark Ready" onClick={() => setConfirmAction('mark_ready')} />}
                    {status === ORDER_STATUSES.READY && <ProductionActionButton themeColor="blue" label="Dispatch Order" onClick={() => router.push('/dispatch-center')} />}
                    {status === ORDER_STATUSES.DISPATCHED && <ProductionActionButton themeColor="green" label="Mark Delivered" onClick={() => router.push('/dispatch-center')} />}
                </div>
            </header>

            {/* Production Timeline */}
            <section className={styles.timelineSection}>
                <div className={styles.timelineTrack}>
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isActive = idx === currentStepIndex;
                        return (
                            <div key={step.key} className={`${styles.step} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''}`}>
                                <div className={styles.stepDot}>
                                    {isCompleted ? <CheckCircle2 size={16} /> : <span>{idx + 1}</span>}
                                </div>
                                <div className={styles.stepLabel}>{step.label}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className={styles.contentGrid}>
                {/* Main Content Column (70%) */}
                <div className={styles.mainCol}>

                    {/* Draft Banner */}
                    {status === ORDER_STATUSES.DRAFT && (
                        <div className={styles.draftBanner}>
                            <div className={styles.draftBannerHeader}>
                                <div className={styles.draftBannerIcon}><AlertCircle size={20} /></div>
                                <div className={styles.draftBannerContent}>
                                    <h3>Review Draft Order</h3>
                                    <p>This is a recurring draft from order #{order.recurring_parent_id || 'unknown'}. Review details and approve to start production.</p>
                                </div>
                            </div>
                            <div className={styles.draftBannerActions}>
                                <button className={styles.btnPrimary} onClick={() => handleStatusChange(ORDER_STATUSES.CREATED)}>Approve Order</button>
                                <button className={styles.btnSecondary} onClick={() => console.log('Editing not implemented yet')}>Edit & Approve</button>
                                <button className={styles.btnSecondary} style={{ color: '#DC2626', borderColor: '#FCA5A5' }} onClick={() => handleStatusChange('cancelled')}>Discard Draft</button>
                            </div>
                        </div>
                    )}

                    {/* Recurring Section */}
                    {status !== ORDER_STATUSES.DRAFT && (
                        <div className={styles.recurringSection}>
                            <div className={styles.recurringToggleRow} onClick={() => handleSaveRecurring(!order.recurring_active)}>
                                <div className={styles.recurringInfo}>
                                    <div className={styles.recurringIcon}><TrendingUp size={20} /></div>
                                    <div className={styles.recurringText}>
                                        <h4>Recurring Order</h4>
                                        <p>Auto-create a draft of this order regularly.</p>
                                    </div>
                                </div>
                                <div className={`toggleSwitch ${order.recurring_active ? 'active' : ''}`} style={{
                                    width: '44px', height: '24px', background: order.recurring_active ? '#AF52DE' : '#E5E5EA', borderRadius: '99px', position: 'relative', transition: '0.3s'
                                }}>
                                    <div style={{
                                        width: '20px', height: '20px', background: '#FFF', borderRadius: '50%', position: 'absolute', top: '2px', left: order.recurring_active ? '22px' : '2px', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}></div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {order.recurring_active && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={styles.recurringDetails}>
                                        <div className={styles.recurringRow}>
                                            <span>Interval</span>
                                            <strong>Weekly (every 7 days)</strong>
                                        </div>
                                        <div className={styles.recurringRow}>
                                            <span>Next draft due on</span>
                                            <strong>{order.recurring_next_due ? new Date(order.recurring_next_due * 1000).toLocaleDateString() : 'Pending calculation'}</strong>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Unified Order Summary */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2><ShoppingBag size={18} /> Order Details</h2>
                        </div>
                        <div className={styles.itemRow}>
                            <div className={styles.itemThumb}>
                                {order.design_image ? <img src={order.design_image} alt="" /> : <Package size={32} opacity={0.2} />}
                            </div>
                            <div style={{flex: 1}}>
                                <div className={styles.itemName}>{order.design_name || 'Custom Order'}</div>
                                <div className={styles.itemSpecs}>{order.quantity_meters} meters × ₹{order.rate_per_meter}/m</div>
                            </div>
                            <div className={styles.itemAmount}>
                                ₹{(order.quantity_meters * order.rate_per_meter).toLocaleString('en-IN')}
                            </div>
                        </div>
                        
                        <div className={styles.pricingTable}>
                            <div className={styles.priceRow}>
                                <span>Fabric & Base Cost</span>
                                <span>₹{(order.quantity_meters * order.rate_per_meter).toLocaleString('en-IN')}</span>
                            </div>
                            <div className={styles.priceRow}>
                                <span>GST (5%)</span>
                                <span>₹{(order.total_price * 0.05).toLocaleString('en-IN')}</span>
                            </div>
                            <div className={`${styles.priceRow} ${styles.totalRow}`}>
                                <span>Grand Total</span>
                                <span>₹{(order.payment?.total || (order.total_price * 1.05)).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Cost Sections */}
                    <h3 style={{fontSize: '18px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: 'var(--text-primary)'}}>Production Costs</h3>
                    
                    {/* Embroidery Section */}
                    <div className={styles.jobCostSection}>
                        <div className={styles.jobCostHeader}>
                            <div className={styles.jobCostTitle}><Scissors size={18} color="#FF9F0A"/> Embroidery Outsourcing</div>
                            <div className={styles.jobCostSummary}>
                                {totalEmbroidery > 0 && <span className={styles.jobCostTotalBadge}>₹{totalEmbroidery.toLocaleString('en-IN')}</span>}
                            </div>
                        </div>
                        <div className={styles.jobCostInner}>
                            <button className={styles.btnSecondary} onClick={() => handleOpenInlineForm('embroidery')} style={{marginBottom: '16px'}}>
                                <Plus size={14}/> Quick Add Cost
                            </button>

                            {addingCostFor === 'embroidery' && renderInlineForm('embroidery')}

                            {embroideryEntries.length > 0 && (
                                <div className={styles.tableContainer}>
                                    <table className={styles.costsTable}>
                                        <thead><tr><th>Vendor</th><th>Meters</th><th>Rate</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {embroideryEntries.map((entry: any) => (
                                                <tr key={entry.id}>
                                                    <td><strong>{entry.vendor_name}</strong></td>
                                                    <td>{entry.metres} m</td>
                                                    <td>₹{entry.rate_per_metre}</td>
                                                    <td><strong>₹{entry.total_cost.toLocaleString('en-IN')}</strong></td>
                                                    <td><span className={entry.status === 'paid' ? styles.badgePaid : styles.badgeUnpaid}>{entry.status}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <button 
                                                                className={styles.iconButton} 
                                                                style={{ color: '#2563eb' }}
                                                                title="Generate Job Work Challan"
                                                                onClick={() => setChallanModalState({ isOpen: true, type: 'jobwork', linkedData: entry })}
                                                            >
                                                                <FileText size={14}/>
                                                            </button>
                                                            <button className={styles.iconButtonDelete} onClick={() => handleDeleteJobCost(entry.id)} disabled={entry.amount_paid > 0}>
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dyeing Section */}
                    <div className={styles.jobCostSection}>
                        <div className={styles.jobCostHeader}>
                            <div className={styles.jobCostTitle}><Droplets size={18} color="#0A84FF"/> Dyeing Outsourcing</div>
                            <div className={styles.jobCostSummary}>
                                {totalDyeing > 0 && <span className={styles.jobCostTotalBadge}>₹{totalDyeing.toLocaleString('en-IN')}</span>}
                            </div>
                        </div>
                        <div className={styles.jobCostInner}>
                            <button className={styles.btnSecondary} onClick={() => handleOpenInlineForm('dyeing')} style={{marginBottom: '16px'}}>
                                <Plus size={14}/> Quick Add Cost
                            </button>

                            {addingCostFor === 'dyeing' && renderInlineForm('dyeing')}

                            {dyeingEntries.length > 0 && (
                                <div className={styles.tableContainer}>
                                    <table className={styles.costsTable}>
                                        <thead><tr><th>Vendor</th><th>Meters</th><th>Rate</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {dyeingEntries.map((entry: any) => (
                                                <tr key={entry.id}>
                                                    <td><strong>{entry.vendor_name}</strong></td>
                                                    <td>{entry.metres} m</td>
                                                    <td>₹{entry.rate_per_metre}</td>
                                                    <td><strong>₹{entry.total_cost.toLocaleString('en-IN')}</strong></td>
                                                    <td><span className={entry.status === 'paid' ? styles.badgePaid : styles.badgeUnpaid}>{entry.status}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <button 
                                                                className={styles.iconButton} 
                                                                style={{ color: '#2563eb' }}
                                                                title="Generate Job Work Challan"
                                                                onClick={() => setChallanModalState({ isOpen: true, type: 'jobwork', linkedData: entry })}
                                                            >
                                                                <FileText size={14}/>
                                                            </button>
                                                            <button className={styles.iconButtonDelete} onClick={() => handleDeleteJobCost(entry.id)} disabled={entry.amount_paid > 0}>
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className={styles.card} style={{marginTop: '16px'}}>
                        <div className={styles.cardHeader}>
                            <h2><Activity size={18} /> Activity Log</h2>
                        </div>
                        <ActivityTimeline logs={auditLogs} loading={auditLoading} />
                    </div>

                </div>

                {/* Sidebar Details Column (30%) Sticky */}
                <aside className={styles.sideCol}>
                    {/* Order Profitability */}
                    <div className={`${styles.card} ${styles.profitabilityCard}`}>
                        <div className={styles.cardHeader}>
                            <h2><TrendingUp size={18} color="#15803D" /> Profitability</h2>
                        </div>
                        <div className={styles.profitabilityList}>
                            <div className={styles.profitabilityRow}>
                                <span>Order Value (Total)</span>
                                <span>₹{orderValue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className={styles.profitabilityRow} style={{ color: '#DC2626' }}>
                                <span>Fabric / Base Cost</span>
                                <span>- ₹{fabricCost.toLocaleString('en-IN')}</span>
                            </div>
                            {embroideryCost > 0 && (
                                <div className={styles.profitabilityRow} style={{ color: '#DC2626' }}>
                                    <span>Embroidery Work</span>
                                    <span>- ₹{embroideryCost.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {dyeingCost > 0 && (
                                <div className={styles.profitabilityRow} style={{ color: '#DC2626' }}>
                                    <span>Dyeing Work</span>
                                    <span>- ₹{dyeingCost.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className={styles.profitabilityTotal}>
                                <span>Gross Profit</span>
                                <span className={grossProfit >= 0 ? styles.profitabilityPositiveText : styles.profitabilityNegativeText}>
                                    ₹{grossProfit.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className={styles.profitabilityRow} style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '13px' }}>
                                <span>Profit Margin</span>
                                <span style={{fontWeight: 700}} className={grossProfit >= 0 ? styles.profitabilityPositiveText : styles.profitabilityNegativeText}>
                                    {marginPercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Progress */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2><CreditCard size={18} /> Payments</h2>
                        </div>
                        <div className={styles.paymentVisual}>
                            <div className={styles.amountDisplay}>
                                <div className={styles.mainAmount}>₹{order.payment.paid.toLocaleString('en-IN')}</div>
                                <div className={styles.totalTarget}>of ₹{order.payment.total.toLocaleString('en-IN')}</div>
                            </div>
                            <div className={styles.progressBar}>
                                <motion.div className={styles.progressFill} style={{ width: `${order.payment.progress}%` }} />
                            </div>
                            <div className={styles.paymentMeta}>
                                {order.payment.progress === 100 ? 'Fully Paid ✓' : `${order.payment.progress.toFixed(0)}% Collected`}
                            </div>
                            {order.payment.pending > 0 && (
                                <button className={styles.btnPrimary} style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }} onClick={handleOpenPaymentModal}>
                                    <DollarSign size={16} /> Record Payment
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer Profile */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2><User size={18} /> Customer Details</h2>
                        </div>
                        <div className={styles.customerProfile}>
                            <div className={styles.avatar}>{order.customer_name[0]}</div>
                            <div className={styles.custName}>{order.customer_name}</div>
                            <div className={styles.custPhone}><Smartphone size={14} /> {order.customer_phone}</div>
                            <button className={styles.waBtn}><Send size={14} /> WhatsApp</button>
                        </div>
                        <div className={styles.custStats}>
                            <div className={styles.statItem}>
                                <label>Total Orders</label>
                                <span>{order.customer_lifetime_orders || 0}</span>
                            </div>
                            <div className={styles.statItem}>
                                <label>Pending Due</label>
                                <span className={order.customer_balance > 0 ? styles.redText : ''}>₹{order.customer_balance?.toLocaleString('en-IN') || 0}</span>
                            </div>
                        </div>
                        <button className={styles.fullProfileBtn} onClick={() => router.push(`/customers/${order.customer_id}`)}>
                            View Customer Workspace <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* Logistics */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2><Truck size={18} /> Logistics</h2>
                        </div>
                        <div className={styles.logisticsInfo}>
                            <div className={styles.detailItem}>
                                <label>Order Date</label>
                                <span>{new Date((order.order_date || order.created_at) * 1000).toLocaleDateString()}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Expected Delivery</label>
                                <span>{order.delivery_date ? new Date(order.delivery_date * 1000).toLocaleDateString() : 'TBD'}</span>
                            </div>
                            <button 
                                className={styles.btnSecondary} 
                                style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                                onClick={() => setChallanModalState({ isOpen: true, type: 'dispatch', linkedData: order })}
                            >
                                <FileText size={14} /> Generate Dispatch Challan
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Inline Payment Modal */}
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} invoice={selectedInvoice} onSave={handleSavePayment} />

            {/* Generate Challan Modal */}
            {challanModalState.isOpen && (
                <GenerateChallanModal 
                    isOpen={challanModalState.isOpen}
                    onClose={() => setChallanModalState({ isOpen: false, type: 'dispatch' })}
                    defaultType={challanModalState.type}
                    linkedOrderData={challanModalState.type === 'dispatch' ? challanModalState.linkedData : order}
                    linkedJobWorkData={challanModalState.type === 'jobwork' ? challanModalState.linkedData : null}
                />
            )}

            {/* Custom Confirm Modal */}
            {renderConfirmModal()}
        </div>
    );
}
