'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, User, Phone, MapPin, Calendar, CheckCircle2, Info, Check, Plus, 
    Trash2, CreditCard, ChevronRight, Loader2, AlertCircle, FileText, X, MoreVertical, Printer, MessageCircle
} from 'lucide-react';
import styles from './DispatchCenter.module.css';
import ChallanViewerDrawer from '@/components/dispatch/ChallanViewerDrawer';

// Eligibility check helper matching other workspace parts
const isEligibleForBulkAction = (order: any): boolean => {
    const stage = order.order_stage || 'order_added';
    const embStatus = order.embroidery_status;
    const dyeStatus = order.dyeing_status;

    return (
        (stage === 'embroidery' && embStatus === 'queued_delivery') ||
        (stage === 'dyeing'     && dyeStatus === 'queued_delivery') ||
        stage === 'ready'
    );
};

export default function DispatchCenterPage() {
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [loadingDeliveries, setLoadingDeliveries] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
    const [isCreatingVendor, setIsCreatingVendor] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [isChallanDrawerOpen, setIsChallanDrawerOpen] = useState(false);
    const [selectedBatchForChallan, setSelectedBatchForChallan] = useState<any>(null);
    const [activeChallanMenuId, setActiveChallanMenuId] = useState<number | null>(null);
    const [lastGeneratedDispatch, setLastGeneratedDispatch] = useState<any>(null);

    // Form data for creating a dispatch
    const [formData, setFormData] = useState({
        transportVendorId: '',
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        route: '',
        deliveryCost: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Form data for inline vendor creation
    const [newVendorData, setNewVendorData] = useState({
        driverName: '',
        mobileNumber: '',
        vehicleNumber: '',
        notes: ''
    });

    useEffect(() => {
        fetchOrders();
        fetchActiveDeliveries();
        fetchVendors();
    }, []);

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setAllOrders(data.orders || []);
            }
        } catch (err) {
            console.error('Failed to fetch orders for ready queue:', err);
        } finally {
            setLoadingOrders(false);
        }
    };

    const fetchActiveDeliveries = async () => {
        setLoadingDeliveries(true);
        try {
            const res = await fetch('/api/dispatch');
            if (res.ok) {
                const data = await res.json();
                setActiveDeliveries(data.dispatches || []);
            }
        } catch (err) {
            console.error('Failed to fetch active deliveries:', err);
        } finally {
            setLoadingDeliveries(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors?type=transport');
            if (res.ok) {
                const data = await res.json();
                setVendors(data.vendors || []);
            }
        } catch (err) {
            console.error('Failed to fetch transport vendors:', err);
        }
    };

    // Filter orders eligible for dispatch
    const readyOrders = useMemo(() => {
        return allOrders.filter(isEligibleForBulkAction);
    }, [allOrders]);

    const selectedOrders = useMemo(() => {
        return readyOrders.filter(o => selectedOrderIds.has(o.id));
    }, [readyOrders, selectedOrderIds]);

    const totalSelectedMeters = useMemo(() => {
        return selectedOrders.reduce((sum, o) => sum + Number(o.quantity_meters || 0), 0);
    }, [selectedOrders]);

    const totalSelectedAmount = useMemo(() => {
        return selectedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    }, [selectedOrders]);

    const toggleOrderSelection = (id: number) => {
        setSelectedOrderIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllReady = () => {
        if (selectedOrderIds.size === readyOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(readyOrders.map(o => o.id)));
        }
    };

    const handleVendorSelect = (vendorId: string) => {
        if (!vendorId) {
            setFormData(prev => ({ 
                ...prev, 
                transportVendorId: '', 
                vehicleNumber: '', 
                driverName: '', 
                driverPhone: '', 
                route: '' 
            }));
            return;
        }

        if (vendorId === 'add_new') {
            setIsCreatingVendor(true);
            setFormData(prev => ({ ...prev, transportVendorId: '' }));
            return;
        }

        const vendor = vendors.find(v => v.id.toString() === vendorId);
        if (vendor) {
            setFormData(prev => ({
                ...prev,
                transportVendorId: vendorId,
                vehicleNumber: vendor.vehicle_number || '',
                driverName: vendor.driver_name || '',
                driverPhone: vendor.contact || '',
                route: vendor.default_route || ''
            }));
            setErrors(prev => ({ ...prev, transportVendorId: '' }));
        }
    };

    const handleCreateVendor = async () => {
        if (!newVendorData.driverName.trim() || !newVendorData.mobileNumber.trim()) {
            alert('Driver name and mobile number are required to register a transport vendor.');
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newVendorData.driverName,
                    contact: newVendorData.mobileNumber,
                    altPhone: '',
                    vendorType: 'transport',
                    materialSupplied: 'Transport Services',
                    vehicleNumber: newVendorData.vehicleNumber,
                    driverName: newVendorData.driverName,
                    vehicleType: '',
                    defaultRoute: '',
                    notes: newVendorData.notes,
                    status: 'active'
                })
            });

            if (res.ok) {
                const data = await res.json();
                await fetchVendors();
                setIsCreatingVendor(false);
                setFormData(prev => ({
                    ...prev,
                    transportVendorId: data.vendorId.toString(),
                    vehicleNumber: newVendorData.vehicleNumber,
                    driverName: newVendorData.driverName,
                    driverPhone: newVendorData.mobileNumber
                }));
                setNewVendorData({ driverName: '', mobileNumber: '', vehicleNumber: '', notes: '' });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to register new driver');
            }
        } catch (err) {
            console.error('Error creating vendor:', err);
            alert('Failed to register vendor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!formData.transportVendorId && !isCreatingVendor) newErrors.transportVendorId = 'Select a driver or vehicle';
        if (!formData.vehicleNumber?.trim()) newErrors.vehicleNumber = 'Vehicle/Tempo number is required';
        if (!formData.driverName?.trim()) newErrors.driverName = 'Driver name is required';
        if (!formData.dispatchDate) newErrors.dispatchDate = 'Dispatch date is required';
        
        if (formData.driverPhone?.trim()) {
            const digits = formData.driverPhone.replace(/\D/g, '');
            if (digits.length < 10) newErrors.driverPhone = 'Mobile number must be at least 10 digits';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const parsedCost = formData.deliveryCost === '' ? null : Number(formData.deliveryCost);
            const res = await fetch('/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryCost: parsedCost,
                    orderIds: selectedOrders.map(o => o.id)
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedOrderIds(new Set());
                setFormData({
                    transportVendorId: '', vehicleNumber: '', driverName: '', driverPhone: '', route: '', deliveryCost: '',
                    dispatchDate: new Date().toISOString().split('T')[0], notes: ''
                });
                setIsCreatingVendor(false);
                setErrors({});
                
                // Get the updated dispatches and open quick access
                await fetchOrders();
                const updatedDispatchesRes = await fetch('/api/dispatch');
                if (updatedDispatchesRes.ok) {
                    const dispatchesData = await updatedDispatchesRes.json();
                    setActiveDeliveries(dispatchesData.dispatches || []);
                    const newDispatch = dispatchesData.dispatches?.find((d: any) => d.id === data.dispatchId);
                    if (newDispatch) {
                        setLastGeneratedDispatch(newDispatch);
                    }
                }
            } else {
                const data = await res.json();
                setErrors({ submit: data.error || 'Failed to dispatch batch' });
            }
        } catch (err: any) {
            console.error('Dispatch creation failed:', err);
            setErrors({ submit: err.message || 'Error occurred while creating dispatch' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkDelivered = async (dispatchId: number, dispatchOrderId: number, orderId: number) => {
        try {
            const res = await fetch(`/api/dispatch/${dispatchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dispatchOrderId,
                    orderId,
                    action: 'mark_delivered'
                })
            });

            if (res.ok) {
                await Promise.all([fetchOrders(), fetchActiveDeliveries()]);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to mark order as delivered');
            }
        } catch (err) {
            console.error('Failed to update delivery status:', err);
        }
    };

    const handleDownloadPdf = (challanId: number, challanNumber: string) => {
        const link = document.createElement('a');
        link.href = `/api/public/challan/${challanId}/pdf`;
        link.download = `Challan_${challanNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShareWhatsapp = (challanId: number, batch: any) => {
        const url = `${window.location.origin}/api/public/challan/${challanId}/pdf`;
        const text = `*Delivery Challan Generated*\n\n*Challan No:* ${batch.challan_number}\n*Date:* ${new Date(batch.dispatch_date).toLocaleDateString('en-IN')}\n*Vehicle:* ${batch.vehicle_number}\n*Orders:* ${batch.orders?.length || 0}\n\nView Challan PDF: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className={styles.dispatchCenter}>
            {/* Header section */}
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <div className={styles.iconContainer}>
                        <Truck size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>Dispatch Center</h1>
                        <p className={styles.subtitle}>Factory floor shipping dashboard. Select ready items to dispatch or mark active shipments delivered.</p>
                    </div>
                </div>
            </div>

            <div className={styles.workspaceGrid}>
                {/* ────────────────── LEFT COLUMN: READY QUEUE ────────────────── */}
                <div className={styles.columnLeft}>
                    <div className={styles.cardHeaderRow}>
                        <h2 className={styles.columnTitle}>
                            Ready Queue <span>({readyOrders.length})</span>
                        </h2>
                        {readyOrders.length > 0 && (
                            <button className={styles.btnLink} onClick={toggleSelectAllReady}>
                                {selectedOrderIds.size === readyOrders.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>

                    {loadingOrders ? (
                        <div className={styles.loadingBox}>
                            <Loader2 className={styles.spinner} size={28} />
                            <p>Loading ready orders...</p>
                        </div>
                    ) : readyOrders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIconBox}>
                                <CheckCircle2 size={32} />
                            </div>
                            <h3>Queue Completed</h3>
                            <p>All manufactured items are currently dispatched or delivered. No batches are awaiting tempo assignment.</p>
                        </div>
                    ) : (
                        <div className={styles.scrollList}>
                            {readyOrders.map(order => {
                                const isSelected = selectedOrderIds.has(order.id);
                                let stageLabel = 'Ready for dispatch';
                                let stageClass = styles.badgeReady;
                                
                                if (order.order_stage === 'embroidery' && order.embroidery_status === 'queued_delivery') {
                                    stageLabel = 'Embroidery Outsource';
                                    stageClass = styles.badgeEmbroidery;
                                } else if (order.order_stage === 'dyeing' && order.dyeing_status === 'queued_delivery') {
                                    stageLabel = 'Dyeing Outsource';
                                    stageClass = styles.badgeDyeing;
                                }

                                return (
                                    <div 
                                        key={order.id} 
                                        className={`${styles.itemCard} ${isSelected ? styles.itemCardSelected : ''}`}
                                        onClick={() => toggleOrderSelection(order.id)}
                                    >
                                        <div className={styles.checkboxWrapper}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => {}} // handled by parent click
                                                className={styles.massiveCheckbox}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemHeader}>
                                                <span className={styles.orderNumber}>
                                                    {order.order_number || `ORD-${order.id}`}
                                                </span>
                                                <span className={`${styles.stageBadge} ${stageClass}`}>
                                                    {stageLabel}
                                                </span>
                                            </div>
                                            <div className={styles.itemDetailRow}>
                                                <strong>{order.customer_name}</strong>
                                                <span className={styles.dot}>•</span>
                                                <span>{order.design_name || 'Solid Fabric'}</span>
                                            </div>
                                            <div className={styles.itemMetrics}>
                                                <span>Qty: <strong>{Number(order.quantity_meters).toFixed(1)}m</strong></span>
                                                <span className={styles.dot}>•</span>
                                                <span>Val: <strong>₹{Number(order.total_price).toLocaleString('en-IN')}</strong></span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className={styles.arrowIcon} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ────────────────── RIGHT COLUMN: ACTION PANEL ────────────────── */}
                <div className={styles.columnRight}>
                    {selectedOrderIds.size > 0 ? (
                        /* ══════════════ DISPATCH CREATION FORM ══════════════ */
                        <div className={styles.dispatchFormCard}>
                            <div className={styles.formHeader}>
                                <h2>Load Tempo & Ship Batch</h2>
                                <p>Provide transport details to generate Delivery Challan PDF and send Telegram notices.</p>
                            </div>

                            <form onSubmit={handleCreateDispatch} className={styles.formBody}>
                                {errors.submit && (
                                    <div className={styles.errorAlert}>
                                        <AlertCircle size={16} />
                                        <span>{errors.submit}</span>
                                    </div>
                                )}

                                {/* Selected summary card */}
                                <div className={styles.selectedMetricsBox}>
                                    <div className={styles.metricItem}>
                                        <span>Load Quantity</span>
                                        <strong>{totalSelectedMeters.toFixed(1)} m</strong>
                                    </div>
                                    <div className={styles.metricItem}>
                                        <span>Total Value</span>
                                        <strong>₹{totalSelectedAmount.toLocaleString('en-IN')}</strong>
                                    </div>
                                    <div className={styles.metricItem}>
                                        <span>Orders</span>
                                        <strong>{selectedOrders.length} count</strong>
                                    </div>
                                </div>

                                {/* Transport vendor select */}
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Driver / Tempo Operator *</label>
                                    {!isCreatingVendor ? (
                                        <div className={styles.selectWrapper}>
                                            <select 
                                                value={formData.transportVendorId}
                                                onChange={e => handleVendorSelect(e.target.value)}
                                                className={errors.transportVendorId ? styles.inputError : ''}
                                            >
                                                <option value="">-- Choose Operator --</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.name} {v.vehicle_number ? `(${v.vehicle_number})` : ''}
                                                    </option>
                                                ))}
                                                <option value="add_new">+ Register New Driver</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div className={styles.inlineVendorCard}>
                                            <h4>Register New Transport Driver</h4>
                                            <div className={styles.inlineInputs}>
                                                <div className={styles.field}>
                                                    <label>Driver Name *</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ramesh Bhai"
                                                        value={newVendorData.driverName}
                                                        onChange={e => setNewVendorData({...newVendorData, driverName: e.target.value})}
                                                    />
                                                </div>
                                                <div className={styles.field}>
                                                    <label>Mobile Number *</label>
                                                    <input 
                                                        type="tel" 
                                                        inputMode="tel"
                                                        placeholder="9876543210"
                                                        value={newVendorData.mobileNumber}
                                                        onChange={e => setNewVendorData({...newVendorData, mobileNumber: e.target.value})}
                                                    />
                                                </div>
                                                <div className={styles.field}>
                                                    <label>Vehicle/Tempo Number</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="GJ05AB1234"
                                                        value={newVendorData.vehicleNumber}
                                                        onChange={e => setNewVendorData({...newVendorData, vehicleNumber: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.inlineActions}>
                                                <button 
                                                    type="button" 
                                                    className={styles.btnInlineCancel} 
                                                    onClick={() => setIsCreatingVendor(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className={styles.btnInlineSave} 
                                                    onClick={handleCreateVendor}
                                                    disabled={isSubmitting}
                                                >
                                                    Save Operator
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {errors.transportVendorId && <span className={styles.fieldErrorMsg}>{errors.transportVendorId}</span>}
                                </div>

                                <div className={styles.inputGrid}>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>Vehicle Number *</label>
                                        <div className={styles.inputWrapper}>
                                            <Truck size={16} />
                                            <input 
                                                type="text"
                                                placeholder="e.g. GJ05AB1234"
                                                value={formData.vehicleNumber}
                                                onChange={e => {
                                                    setFormData({...formData, vehicleNumber: e.target.value});
                                                    setErrors({...errors, vehicleNumber: ''});
                                                }}
                                                className={errors.vehicleNumber ? styles.inputError : ''}
                                            />
                                        </div>
                                        {errors.vehicleNumber && <span className={styles.fieldErrorMsg}>{errors.vehicleNumber}</span>}
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>Driver Name *</label>
                                        <div className={styles.inputWrapper}>
                                            <User size={16} />
                                            <input 
                                                type="text"
                                                placeholder="e.g. Ramesh Patel"
                                                value={formData.driverName}
                                                onChange={e => {
                                                    setFormData({...formData, driverName: e.target.value});
                                                    setErrors({...errors, driverName: ''});
                                                }}
                                                className={errors.driverName ? styles.inputError : ''}
                                            />
                                        </div>
                                        {errors.driverName && <span className={styles.fieldErrorMsg}>{errors.driverName}</span>}
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>Driver Phone</label>
                                        <div className={styles.inputWrapper}>
                                            <Phone size={16} />
                                            <input 
                                                type="tel"
                                                inputMode="tel"
                                                placeholder="e.g. 9876543210"
                                                value={formData.driverPhone}
                                                onChange={e => {
                                                    setFormData({...formData, driverPhone: e.target.value});
                                                    setErrors({...errors, driverPhone: ''});
                                                }}
                                                className={errors.driverPhone ? styles.inputError : ''}
                                            />
                                        </div>
                                        {errors.driverPhone && <span className={styles.fieldErrorMsg}>{errors.driverPhone}</span>}
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>Route / Target Area</label>
                                        <div className={styles.inputWrapper}>
                                            <MapPin size={16} />
                                            <input 
                                                type="text"
                                                placeholder="e.g. Ring Road, Surat"
                                                value={formData.route}
                                                onChange={e => setFormData({...formData, route: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>Freight / Delivery Cost (₹)</label>
                                        <div className={styles.inputWrapper}>
                                            <CreditCard size={16} />
                                            <input 
                                                type="number"
                                                inputMode="decimal"
                                                placeholder="e.g. 500"
                                                value={formData.deliveryCost}
                                                onChange={e => setFormData({...formData, deliveryCost: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>Dispatch Date *</label>
                                        <div className={styles.inputWrapper}>
                                            <Calendar size={16} />
                                            <input 
                                                type="date"
                                                value={formData.dispatchDate}
                                                onChange={e => {
                                                    setFormData({...formData, dispatchDate: e.target.value});
                                                    setErrors({...errors, dispatchDate: ''});
                                                }}
                                                className={errors.dispatchDate ? styles.inputError : ''}
                                            />
                                        </div>
                                        {errors.dispatchDate && <span className={styles.fieldErrorMsg}>{errors.dispatchDate}</span>}
                                    </div>
                                </div>

                                <div className={styles.field} style={{ marginTop: '12px' }}>
                                    <label className={styles.fieldLabel}>Special Shipping Notes</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Delivery after 4 PM, call customer first..."
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                        className={styles.plainInput}
                                    />
                                </div>

                                <div className={styles.formActions}>
                                    <button 
                                        type="button" 
                                        className={styles.btnCancel}
                                        onClick={() => setSelectedOrderIds(new Set())}
                                        disabled={isSubmitting}
                                    >
                                        Cancel Selection
                                    </button>
                                    <button 
                                        type="submit" 
                                        className={styles.btnSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className={styles.spin} size={18} />
                                                Shipping Batch...
                                            </>
                                        ) : (
                                            <>
                                                <Truck size={18} />
                                                Dispatch & Generate Challan
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {lastGeneratedDispatch && (
                                <div className={styles.dispatchSuccessBox}>
                                    <div className={styles.successHeader}>
                                        <CheckCircle2 size={24} color="#10B981" />
                                        <div>
                                            <h3>Dispatch Successful!</h3>
                                            <p>Batch #{lastGeneratedDispatch.dispatch_number} has been generated.</p>
                                        </div>
                                    </div>
                                    <div className={styles.successActions}>
                                        <button 
                                            className={styles.btnSecondary}
                                            onClick={() => {
                                                setSelectedBatchForChallan(lastGeneratedDispatch);
                                                setIsChallanDrawerOpen(true);
                                            }}
                                        >
                                            <FileText size={16} />
                                            View Challan
                                        </button>
                                        <button 
                                            className={styles.btnSecondary}
                                            onClick={() => setLastGeneratedDispatch(null)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ══════════════ ACTIVE DELIVERIES VIEW ══════════════ */
                        <div className={styles.activeDeliveriesContainer}>
                            <h2 className={styles.columnTitle}>Active Deliveries Out</h2>
                            
                            {loadingDeliveries ? (
                                <div className={styles.loadingBox}>
                                    <Loader2 className={styles.spinner} size={28} />
                                    <p>Loading active deliveries...</p>
                                </div>
                            ) : activeDeliveries.length === 0 ? (
                                <div className={styles.emptyDeliveriesCard}>
                                    <Truck size={36} className={styles.deliveryIcon} />
                                    <h3>No Active Deliveries</h3>
                                    <p>All dispatched tempos have completed their routes. Select ready orders on the left to load the next vehicle.</p>
                                </div>
                            ) : (
                                <div className={styles.deliveriesList}>
                                    {activeDeliveries.map(batch => (
                                        <div key={batch.id} className={styles.batchCard}>
                                            {/* Batch general info */}
                                            <div className={styles.batchHeader}>
                                                <div className={styles.batchHeaderLeft}>
                                                    <div className={styles.tempoBadge}>
                                                        <Truck size={14} />
                                                        <strong>{batch.vehicle_number}</strong>
                                                    </div>
                                                    <span className={styles.driverName}>
                                                        Driver: <strong>{batch.driver_name}</strong>
                                                    </span>
                                                </div>
                                                <span className={styles.routeBadge}>
                                                    {batch.route || 'Local Route'}
                                                </span>
                                            </div>

                                            <div className={styles.batchSubHeader} style={{ flexWrap: 'wrap', gap: '12px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {batch.challan_number ? (
                                                            <span className={styles.challanGeneratedBadge}>✓ Challan Generated ({batch.challan_number})</span>
                                                        ) : (
                                                            <span className={styles.challanPendingBadge}>Challan Pending</span>
                                                        )}
                                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                            {new Date(batch.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    
                                                    {batch.challan_id && (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button 
                                                                style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                                                onClick={() => {
                                                                    setSelectedBatchForChallan(batch);
                                                                    setIsChallanDrawerOpen(true);
                                                                }}
                                                            >
                                                                <FileText size={14} /> View Challan
                                                            </button>
                                                            <button 
                                                                style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                                                onClick={() => handleDownloadPdf(batch.challan_id, batch.challan_number)}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                                    <div className={styles.menuContainer}>
                                                        <button 
                                                            className={styles.menuTrigger}
                                                            onClick={() => setActiveChallanMenuId(activeChallanMenuId === batch.id ? null : batch.id)}
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        
                                                        {activeChallanMenuId === batch.id && (
                                                            <div className={styles.dropdownMenu}>
                                                                {batch.challan_id && (
                                                                    <>
                                                                        <button onClick={() => {
                                                                            setSelectedBatchForChallan(batch);
                                                                            setIsChallanDrawerOpen(true);
                                                                            setActiveChallanMenuId(null);
                                                                        }}>
                                                                            <Info size={14} /> View Delivery Challan
                                                                        </button>
                                                                        <button onClick={() => {
                                                                            handleDownloadPdf(batch.challan_id, batch.challan_number);
                                                                            setActiveChallanMenuId(null);
                                                                        }}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Challan PDF
                                                                        </button>
                                                                        <button onClick={() => {
                                                                            window.open(`/api/public/challan/${batch.challan_id}/pdf`, '_blank');
                                                                            setActiveChallanMenuId(null);
                                                                        }}>
                                                                            <Printer size={14} /> Reprint Challan
                                                                        </button>
                                                                        <button onClick={() => {
                                                                            const text = encodeURIComponent(`Delivery Challan ${batch.challan_number} for your order has been generated. Driver: ${batch.driver_name} (${batch.vehicle_number}).`);
                                                                            window.open(`https://wa.me/?text=${text}`, '_blank');
                                                                            setActiveChallanMenuId(null);
                                                                        }}>
                                                                            <MessageCircle size={14} /> Share on WhatsApp
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button onClick={() => {
                                                                    setSelectedBatchForChallan(batch);
                                                                    setIsChallanDrawerOpen(true);
                                                                    setActiveChallanMenuId(null);
                                                                }}>
                                                                    <FileText size={14} /> Open Dispatch Details
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nested order checklists */}
                                            <div className={styles.nestedOrders}>
                                                <span className={styles.sectionHeading}>Included Orders ({batch.orders?.length || 0}):</span>
                                                <div className={styles.ordersGrid}>
                                                    {batch.orders?.map((ord: any) => {
                                                        const isDelivered = ord.delivery_status === 'delivered';
                                                        return (
                                                            <div 
                                                                key={ord.dispatch_order_id} 
                                                                className={`${styles.nestedOrderCard} ${isDelivered ? styles.deliveredOrder : ''}`}
                                                            >
                                                                <div className={styles.orderCardLeft}>
                                                                    <div className={styles.ordNum}>
                                                                        {ord.order_number}
                                                                    </div>
                                                                    <div className={styles.ordCust}>
                                                                        {ord.customer_name} ({Number(ord.quantity_meters).toFixed(0)}m)
                                                                    </div>
                                                                </div>
                                                                
                                                                {isDelivered ? (
                                                                    <div className={styles.deliveredPill}>
                                                                        <Check size={12} /> Delivered
                                                                    </div>
                                                                ) : (
                                                                    <button 
                                                                        className={styles.btnCheckoff}
                                                                        onClick={() => handleMarkDelivered(batch.id, ord.dispatch_order_id, ord.order_id)}
                                                                        title="Mark Delivered"
                                                                    >
                                                                        <CheckCircle2 size={18} />
                                                                        <span>Deliver</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <ChallanViewerDrawer 
                isOpen={isChallanDrawerOpen}
                onClose={() => setIsChallanDrawerOpen(false)}
                batch={selectedBatchForChallan}
                onDownloadPdf={handleDownloadPdf}
                onShareWhatsapp={handleShareWhatsapp}
            />
        </div>
    );
}
