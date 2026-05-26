import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Phone, MapPin, Calendar, FileText, UserPlus, Check } from 'lucide-react';
import styles from './CreateDispatchModal.module.css';

interface CreateDispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedOrders: any[];
}

export default function CreateDispatchModal({ isOpen, onClose, onSuccess, selectedOrders }: CreateDispatchModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Vendor state
    const [vendors, setVendors] = useState<any[]>([]);
    const [isCreatingVendor, setIsCreatingVendor] = useState(false);
    const [newVendorData, setNewVendorData] = useState({
        businessName: '',
        driverName: '',
        mobileNumber: '',
        alternateNumber: '',
        vehicleNumber: '',
        vehicleType: '',
        routeArea: '',
        notes: ''
    });

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

    useEffect(() => {
        if (isOpen) {
            fetchVendors();
        }
    }, [isOpen]);

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors?type=transport');
            if (res.ok) {
                const data = await res.json();
                setVendors(data.vendors || []);
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        }
    };

    const handleVendorSelect = (vendorId: string) => {
        if (!vendorId) {
            setFormData(prev => ({ ...prev, transportVendorId: '', vehicleNumber: '', driverName: '', driverPhone: '', route: '' }));
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
            alert('Driver name and mobile number are required to create a new transport vendor.');
            return;
        }
        try {
            setIsSubmitting(true);
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
                    driverPhone: newVendorData.mobileNumber,
                    route: ''
                }));
                setNewVendorData({
                    businessName: '', driverName: '', mobileNumber: '', alternateNumber: '',
                    vehicleNumber: '', vehicleType: '', routeArea: '', notes: ''
                });
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create vendor');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!formData.transportVendorId && !isCreatingVendor) newErrors.transportVendorId = 'Please select a transport vendor';
        if (!formData.vehicleNumber?.trim()) newErrors.vehicleNumber = 'Vehicle number is required';
        if (!formData.dispatchDate) newErrors.dispatchDate = 'Dispatch date is required';
        if (!formData.driverName?.trim()) newErrors.driverName = 'Driver name is required';
        if (formData.driverPhone?.trim()) {
            const digitsOnly = formData.driverPhone.replace(/\D/g, '');
            if (digitsOnly.length < 10) {
                newErrors.driverPhone = 'Mobile number must have at least 10 digits';
            }
        }

        if (formData.deliveryCost !== '' && Number(formData.deliveryCost) < 0) {
            newErrors.deliveryCost = 'Delivery cost cannot be negative';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const parsedDeliveryCost =
                formData.deliveryCost === "" ||
                formData.deliveryCost === null ||
                formData.deliveryCost === undefined
                    ? null
                    : Number(formData.deliveryCost);

            const res = await fetch('/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryCost: parsedDeliveryCost,
                    orderIds: selectedOrders.map(o => o.id)
                })
            });

            if (res.ok) {
                onSuccess();
                setFormData({
                    transportVendorId: '', vehicleNumber: '', driverName: '', driverPhone: '', route: '', deliveryCost: '',
                    dispatchDate: new Date().toISOString().split('T')[0], notes: ''
                });
                setIsCreatingVendor(false);
                setErrors({});
            } else {
                const data = await res.json();
                setErrors({ submit: data.error || 'Failed to create dispatch' });
            }
        } catch (error: any) {
            console.error(error);
            setErrors({ submit: error.message || 'An unexpected error occurred' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // BUG FIX: Convert quantities to Numbers before summing!
    const totalMeters = selectedOrders.reduce((sum, o) => sum + Number(o.quantity_meters || 0), 0);
    const totalAmount = selectedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    return (
        <AnimatePresence>
            <div className={styles.overlay} onClick={onClose}>
                <motion.div 
                    className={styles.modal}
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    <div className={styles.header}>
                        <div className={styles.titleGroup}>
                            <div className={styles.iconBox}>
                                <Truck size={24} color="#0EA5E9" />
                            </div>
                            <div>
                                <h2>Create Dispatch Batch</h2>
                                <p>Assign tempo and driver for selected orders</p>
                            </div>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.bodyLayout}>
                            <div className={styles.leftPanel}>
                                <div className={styles.grid}>

                            {errors.submit && (
                                <div style={{ gridColumn: '1 / -1', background: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                                    {errors.submit}
                                </div>
                            )}
                                    
                                    {/* Transport Vendor Section */}
                            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                <label>Transport Vendor *</label>
                                {!isCreatingVendor ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div className={styles.inputWrapper} style={{ flex: 1 }}>
                                            <Truck size={16} />
                                            <select 
                                                value={formData.transportVendorId}
                                                onChange={e => handleVendorSelect(e.target.value)}
                                                className={errors.transportVendorId ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}
                                                style={{ width: '100%', outline: 'none' }}
                                            >
                                                <option value="">-- Select Driver / Tempo --</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} {v.vehicle_number ? `(${v.vehicle_number})` : ''}</option>
                                                ))}
                                                <option value="add_new">+ Add New Driver / Tempo</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>Add New Transport Vendor</div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div className={styles.field}>
                                                <label>Driver Name *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ramesh Bhai"
                                                    value={newVendorData.driverName}
                                                    onChange={e => setNewVendorData({...newVendorData, driverName: e.target.value})}
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className={styles.field}>
                                                <label>Mobile Number *</label>
                                                <input 
                                                    type="tel" 
                                                    placeholder="9876543210"
                                                    value={newVendorData.mobileNumber}
                                                    onChange={e => setNewVendorData({...newVendorData, mobileNumber: e.target.value})}
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                            <div className={styles.field}>
                                                <label>Vehicle Number</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="GJ 05 AB 1234"
                                                    value={newVendorData.vehicleNumber}
                                                    onChange={e => setNewVendorData({...newVendorData, vehicleNumber: e.target.value})}
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.field}>
                                            <label>Notes</label>
                                            <input 
                                                type="text" 
                                                placeholder="Any internal notes..."
                                                value={newVendorData.notes}
                                                onChange={e => setNewVendorData({...newVendorData, notes: e.target.value})}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => setIsCreatingVendor(false)}
                                                style={{ color: '#475569', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={handleCreateVendor}
                                                style={{ background: '#0EA5E9', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}
                                                disabled={isSubmitting}
                                            >
                                                <Check size={16} /> Save Vendor
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {errors.transportVendorId && <p className="text-red-500 text-xs mt-1">{errors.transportVendorId}</p>}
                            </div>

                            <div className={styles.field}>
                                <label>Vehicle Number *</label>
                                <div className={styles.inputWrapper}>
                                    <Truck size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="GJ05AB1234"
                                        value={formData.vehicleNumber}
                                        onChange={e => { setFormData({...formData, vehicleNumber: e.target.value}); setErrors({...errors, vehicleNumber: ''}); }}
                                        className={errors.vehicleNumber ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}
                                    />
                                </div>
                                {errors.vehicleNumber && <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber}</p>}
                            </div>

                            <div className={styles.field}>
                                <label>Driver Name *</label>
                                <div className={styles.inputWrapper}>
                                    <UserPlus size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Ramesh Patel"
                                        value={formData.driverName}
                                        onChange={e => { setFormData({...formData, driverName: e.target.value}); setErrors({...errors, driverName: ''}); }}
                                        className={errors.driverName ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}
                                    />
                                </div>
                                {errors.driverName && <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>}
                            </div>

                            <div className={styles.field}>
                                <label>Driver Phone {isCreatingVendor ? '*' : ''}</label>
                                <div className={styles.inputWrapper}>
                                    <Phone size={16} />
                                    <input 
                                        type="tel" 
                                        placeholder="e.g. 9876543210"
                                        value={formData.driverPhone}
                                        onChange={e => { setFormData({...formData, driverPhone: e.target.value}); setErrors({...errors, driverPhone: ''}); }}
                                        className={errors.driverPhone ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}
                                    />
                                </div>
                                {errors.driverPhone && <p className="text-red-500 text-xs mt-1">{errors.driverPhone}</p>}
                            </div>

                            <div className={styles.field}>
                                <label>Route / Area</label>
                                <div className={styles.inputWrapper}>
                                    <MapPin size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Ring Road, Surat"
                                        value={formData.route}
                                        onChange={e => setFormData({...formData, route: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.field}>
                                <label>Delivery Cost (₹) (Optional)</label>
                                <div className={styles.inputWrapper}>
                                    <span style={{position: 'absolute', left: '16px', color: '#64748B', fontWeight: 600, pointerEvents: 'none'}}>₹</span>
                                    <input 
                                        type="number" 
                                        placeholder="Enter later if not confirmed"
                                        value={formData.deliveryCost}
                                        onChange={e => setFormData({...formData, deliveryCost: e.target.value})}
                                    />
                                </div>
                                {errors.deliveryCost && <p className="text-red-500 text-xs mt-1">{errors.deliveryCost}</p>}
                            </div>

                            <div className={styles.field}>
                                <label>Dispatch Date *</label>
                                <div className={styles.inputWrapper}>
                                    <Calendar size={16} />
                                    <input 
                                        type="date" 
                                        value={formData.dispatchDate}
                                        onChange={e => { setFormData({...formData, dispatchDate: e.target.value}); setErrors({...errors, dispatchDate: ''}); }}
                                        className={errors.dispatchDate ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}
                                    />
                                </div>
                                {errors.dispatchDate && <p className="text-red-500 text-xs mt-1">{errors.dispatchDate}</p>}
                            </div>

                            <div className={styles.field}>
                                <label>Notes</label>
                                <div className={styles.inputWrapper}>
                                    <FileText size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Any special instructions..."
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className={styles.rightPanel}>
                        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                    <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Truck size={18} color="#0EA5E9" /> Selected Orders ({selectedOrders.length})
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
                                        <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Total Fabric Value</div>
                                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px' }}>{totalMeters.toLocaleString('en-IN')}m</div>
                                        </div>
                                        <div style={{ background: '#F0F9FF', padding: '16px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '13px', color: '#0369A1', marginBottom: '4px', fontWeight: 500 }}>Total Order Value</div>
                                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0C4A6E', letterSpacing: '-0.5px' }}>₹{totalAmount.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Order Details</div>
                                    <div className={styles.ordersList} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                                        {selectedOrders.map(o => (
                                            <div key={o.id} style={{ background: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600 }}>{o.order_number || `ORD-${o.id}`}</span>
                                                <span style={{ color: '#64748B' }}>{o.customer_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || selectedOrders.length === 0}>
                                {isSubmitting ? 'Creating...' : 'Create Dispatch'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
