import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';

interface DispatchOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
}

export default function DispatchOrderModal({ isOpen, onClose, onSuccess, order }: DispatchOrderModalProps) {
    const [transporterName, setTransporterName] = useState<string>('');
    const [lrNumber, setLrNumber] = useState<string>('');
    const [dispatchDate, setDispatchDate] = useState<string>('');
    const [metresDispatched, setMetresDispatched] = useState<string>('');
    const [expectedDelivery, setExpectedDelivery] = useState<string>('');
    const [generateChallan, setGenerateChallan] = useState(true);
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && order) {
            setTransporterName('');
            setLrNumber('');
            setDispatchDate(new Date().toISOString().split('T')[0]);
            setMetresDispatched(order.quantity_meters?.toString() || '');
            
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setExpectedDelivery(nextWeek.toISOString().split('T')[0]);
            
            setGenerateChallan(true);
            setNotes('');
            setError('');
            setErrors({});
        }
    }, [isOpen, order]);

    if (!isOpen || !order || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!transporterName?.trim()) newErrors.transporterName = 'Transporter name is required';
        if (!lrNumber?.trim()) newErrors.lrNumber = 'LR/Docket number is required';
        if (!dispatchDate) newErrors.dispatchDate = 'Dispatch date is required';
        if (!metresDispatched || parseFloat(metresDispatched) <= 0) newErrors.metresDispatched = 'Metres dispatched is required and must be > 0';
        if (!expectedDelivery) newErrors.expectedDelivery = 'Expected delivery date is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const parsedMetresDispatched = parseFloat(metresDispatched) || 0;

            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'dispatch',
                    transporterName,
                    lrNumber,
                    dispatchDate,
                    metresDispatched: parsedMetresDispatched,
                    expectedDelivery,
                    generateChallan,
                    notes
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update workflow');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.title}>Dispatch Order</h2>
                        <p className={styles.subtitle}>
                            Order {order.order_number || order.id} ({order.customer_name})
                        </p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.formBody}>
                    {error && (
                        <div className={styles.errorBox}>
                            {error}
                        </div>
                    )}

                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Transporter Name *</label>
                            <input
                                type="text"
                                value={transporterName}
                                onChange={(e) => { setTransporterName(e.target.value); setErrors({...errors, transporterName: ''}); }}
                                className={`${styles.input} ${errors.transporterName ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.transporterName}
                            />
                            {errors.transporterName && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.transporterName}</p>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>LR / Docket Number *</label>
                            <input
                                type="text"
                                value={lrNumber}
                                onChange={(e) => { setLrNumber(e.target.value); setErrors({...errors, lrNumber: ''}); }}
                                className={`${styles.input} ${errors.lrNumber ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.lrNumber}
                            />
                            {errors.lrNumber && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.lrNumber}</p>}
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Dispatch Date *</label>
                            <input
                                type="date"
                                value={dispatchDate}
                                onChange={(e) => { setDispatchDate(e.target.value); setErrors({...errors, dispatchDate: ''}); }}
                                className={`${styles.input} ${errors.dispatchDate ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.dispatchDate}
                            />
                            {errors.dispatchDate && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.dispatchDate}</p>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Metres Dispatched *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={metresDispatched}
                                onChange={(e) => { setMetresDispatched(e.target.value); setErrors({...errors, metresDispatched: ''}); }}
                                className={`${styles.input} ${errors.metresDispatched ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.metresDispatched}
                            />
                            {errors.metresDispatched && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.metresDispatched}</p>}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Expected Delivery Date *</label>
                        <input
                            type="date"
                            value={expectedDelivery}
                            onChange={(e) => { setExpectedDelivery(e.target.value); setErrors({...errors, expectedDelivery: ''}); }}
                            className={`${styles.input} ${errors.expectedDelivery ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                            data-error={!!errors.expectedDelivery}
                        />
                        {errors.expectedDelivery && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.expectedDelivery}</p>}
                    </div>

                    <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            id="generateDispatchChallan"
                            checked={generateChallan}
                            onChange={(e) => setGenerateChallan(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="generateDispatchChallan" className={styles.label} style={{ margin: 0, cursor: 'pointer' }}>
                            Generate dispatch challan PDF automatically
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={styles.textarea}
                            rows={2}
                            placeholder="Add any specific dispatch notes..."
                        />
                    </div>

                    <div className={styles.formFooter}>
                        <button type="button" className={styles.workflowSecondary} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.btnGreen} disabled={isSubmitting}>
                            <Truck size={16} />
                            {isSubmitting ? 'Dispatching...' : 'Dispatch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
