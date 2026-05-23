import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';
import { celebrateSmall } from '@/lib/confetti';

interface ConfirmReceivedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
    action: 'mark_printing' | 'mark_ready';
}

export default function ConfirmReceivedModal({ isOpen, onClose, onSuccess, order, action }: ConfirmReceivedModalProps) {
    const [metersReceived, setMetersReceived] = useState<string>('');
    const [dateReceived, setDateReceived] = useState<string>('');
    const [qualityResult, setQualityResult] = useState<string>('');
    const [failReason, setFailReason] = useState<string>('');
    const [rejectionMeters, setRejectionMeters] = useState<string>('');
    const [reworkNeeded, setReworkNeeded] = useState<boolean>(false);
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
            setMetersReceived(order.quantity_meters?.toString() || '');
            setDateReceived(new Date().toISOString().split('T')[0]);
            setQualityResult('');
            setFailReason('');
            setRejectionMeters('');
            setReworkNeeded(false);
            setNotes('');
            setError('');
            setErrors({});
        }
    }, [isOpen, order]);

    if (!isOpen || !order || !mounted) return null;

    const title = action === 'mark_printing' ? 'Confirm Embroidery Received' : 'Confirm Dyeing Received & Quality Check';
    const isDyeing = action === 'mark_ready';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!metersReceived || parseFloat(metersReceived) <= 0) newErrors.metersReceived = 'Meters received is required and must be greater than 0';
        if (!dateReceived) newErrors.dateReceived = 'Date received is required';
        if (!qualityResult) newErrors.qualityResult = 'Quality check result is required';

        if (qualityResult === 'fail') {
            if (!failReason) newErrors.failReason = 'Defect type is required';
            if (!rejectionMeters || parseFloat(rejectionMeters) <= 0) newErrors.rejectionMeters = 'Rejection meters is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const parsedMetersReceived = parseFloat(metersReceived) || 0;
            const parsedRejectionMeters = parseFloat(rejectionMeters) || 0;

            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    metresReceived: parsedMetersReceived,
                    dateReceived,
                    qualityResult: qualityResult === 'fail' ? `Fail: ${failReason} (${parsedRejectionMeters}m)` : qualityResult,
                    reworkNeeded,
                    notes
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update workflow');
            }

            if (action === 'mark_ready') {
                celebrateSmall(`confetti_ready_${order.id}`);
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
                        <h2 className={styles.title}>{title}</h2>
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
                            <label className={styles.label}>Metres Received Back *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={metersReceived}
                                onChange={(e) => { setMetersReceived(e.target.value); setErrors({...errors, metersReceived: ''}); }}
                                className={`${styles.input} ${errors.metersReceived ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.metersReceived}
                            />
                            {errors.metersReceived && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.metersReceived}</p>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date Received *</label>
                            <input
                                type="date"
                                value={dateReceived}
                                onChange={(e) => { setDateReceived(e.target.value); setErrors({...errors, dateReceived: ''}); }}
                                className={`${styles.input} ${errors.dateReceived ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                data-error={!!errors.dateReceived}
                            />
                            {errors.dateReceived && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.dateReceived}</p>}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Quality Check Result *</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="quality" value="Good" checked={qualityResult === 'Good'} onChange={(e) => { setQualityResult(e.target.value); setErrors({...errors, qualityResult: ''}); }} />
                                Good / Pass
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="quality" value="Minor defects" checked={qualityResult === 'Minor defects'} onChange={(e) => { setQualityResult(e.target.value); setErrors({...errors, qualityResult: ''}); }} />
                                Minor defects / Pass
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="quality" value="fail" checked={qualityResult === 'fail'} onChange={(e) => { setQualityResult(e.target.value); setErrors({...errors, qualityResult: ''}); }} />
                                Major defects / Fail
                            </label>
                        </div>
                        {errors.qualityResult && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.qualityResult}</p>}
                    </div>

                    {qualityResult === 'fail' && (
                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
                            <div className={styles.grid}>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.label}>Defect Type *</label>
                                    <select 
                                        className={`${styles.select} ${errors.failReason ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`} 
                                        value={failReason} 
                                        onChange={e => { setFailReason(e.target.value); setErrors({...errors, failReason: ''}); }} 
                                        data-error={!!errors.failReason}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Print misalignment">Print misalignment</option>
                                        <option value="Shade variation">Shade variation</option>
                                        <option value="Fabric defect">Fabric defect</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.failReason && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.failReason}</p>}
                                </div>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.label}>Rejection Metres *</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        step="0.1" 
                                        className={`${styles.input} ${errors.rejectionMeters ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`} 
                                        value={rejectionMeters} 
                                        onChange={e => { setRejectionMeters(e.target.value); setErrors({...errors, rejectionMeters: ''}); }} 
                                        data-error={!!errors.rejectionMeters}
                                    />
                                    {errors.rejectionMeters && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.rejectionMeters}</p>}
                                </div>
                            </div>
                            {isDyeing && (
                                <div className={styles.formGroup} style={{ marginTop: '12px', marginBottom: 0 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={reworkNeeded} onChange={e => setReworkNeeded(e.target.checked)} />
                                        <span style={{ fontSize: '13px', fontWeight: 500 }}>Send for rework?</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={styles.textarea}
                            rows={2}
                            placeholder="Add any specific quality notes..."
                        />
                    </div>

                    <div className={styles.formFooter}>
                        <button type="button" className={styles.btnCancel} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                            <CheckCircle2 size={16} />
                            {isSubmitting ? 'Processing...' : 'Confirm Received'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
