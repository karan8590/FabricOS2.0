import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';
import { celebrateBig } from '@/lib/confetti';

interface ConfirmDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
}

export default function ConfirmDeliveryModal({ isOpen, onClose, onSuccess, order }: ConfirmDeliveryModalProps) {
    const [dateDelivered, setDateDelivered] = useState<string>('');
    const [deliveredTo, setDeliveredTo] = useState<string>('');
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
            setDateDelivered(new Date().toISOString().split('T')[0]);
            setDeliveredTo('');
            setNotes('');
            setError('');
            setErrors({});
        }
    }, [isOpen, order]);

    if (!isOpen || !order || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!dateDelivered) newErrors.dateDelivered = 'Date delivered is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_delivered',
                    dateDelivered,
                    deliveredTo,
                    notes
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update workflow');
            }

            celebrateBig(`confetti_delivered_${order.id}`);
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
                <div className={styles.mobileSheetHandle} />
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.title}>Confirm Delivery</h2>
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
                            <label className={styles.label}>Date Delivered *</label>
                            <input
                                type="date"
                                value={dateDelivered}
                                onChange={(e) => { setDateDelivered(e.target.value); setErrors({...errors, dateDelivered: ''}); }}
                                className={`${styles.input} ${errors.dateDelivered ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.dateDelivered}
                            />
                            {errors.dateDelivered && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.dateDelivered}</p>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Delivered To (Name)</label>
                            <input
                                type="text"
                                value={deliveredTo}
                                onChange={(e) => setDeliveredTo(e.target.value)}
                                className={styles.input}
                                placeholder="Person who received it"
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={styles.textarea}
                            rows={2}
                            placeholder="Add any specific delivery notes..."
                        />
                    </div>

                    <div className={styles.formFooter}>
                        <button type="button" className={styles.workflowSecondary} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.btnGreen} disabled={isSubmitting}>
                            <CheckCircle2 size={16} />
                            {isSubmitting ? 'Processing...' : 'Confirm Delivery'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
