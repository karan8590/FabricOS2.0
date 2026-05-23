import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Phone, MapPin, Calendar, FileText } from 'lucide-react';
import styles from './CreateDispatchModal.module.css';

interface CreateDispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedOrders: any[];
}

export default function CreateDispatchModal({ isOpen, onClose, onSuccess, selectedOrders }: CreateDispatchModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        route: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    orderIds: selectedOrders.map(o => o.id)
                })
            });

            if (res.ok) {
                onSuccess();
                setFormData({
                    vehicleNumber: '', driverName: '', driverPhone: '', route: '',
                    dispatchDate: new Date().toISOString().split('T')[0], notes: ''
                });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create dispatch');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalMeters = selectedOrders.reduce((sum, o) => sum + (o.quantity_meters || 0), 0);
    const totalAmount = selectedOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

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
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label>Vehicle Number *</label>
                                <div className={styles.inputWrapper}>
                                    <Truck size={16} />
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="GJ05AB1234"
                                        value={formData.vehicleNumber}
                                        onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Dispatch Date *</label>
                                <div className={styles.inputWrapper}>
                                    <Calendar size={16} />
                                    <input 
                                        type="date" 
                                        required 
                                        value={formData.dispatchDate}
                                        onChange={e => setFormData({...formData, dispatchDate: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Driver Name *</label>
                                <div className={styles.inputWrapper}>
                                    <span style={{ marginLeft: '12px' }}>👤</span>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Ramesh Patel"
                                        value={formData.driverName}
                                        onChange={e => setFormData({...formData, driverName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Driver Phone</label>
                                <div className={styles.inputWrapper}>
                                    <Phone size={16} />
                                    <input 
                                        type="tel" 
                                        placeholder="+91..."
                                        value={formData.driverPhone}
                                        onChange={e => setFormData({...formData, driverPhone: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
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

                            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
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

                        <div className={styles.summaryBox}>
                            <h4>Selected Orders Preview ({selectedOrders.length})</h4>
                            <div className={styles.summaryMetrics}>
                                <span>Total Meters: <strong>{totalMeters}m</strong></span>
                                <span>Total Value: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong></span>
                            </div>
                            <div className={styles.ordersList}>
                                {selectedOrders.map(o => (
                                    <div key={o.id} className={styles.orderBadge}>
                                        {o.order_number || `ORD-${o.id}`} • {o.customer_name}
                                    </div>
                                ))}
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
