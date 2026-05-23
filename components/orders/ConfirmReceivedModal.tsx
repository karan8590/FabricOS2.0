import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';

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
        }
    }, [isOpen, order]);

    if (!isOpen || !order || !mounted) return null;

    const title = action === 'mark_printing' ? 'Confirm Embroidery Received' : 'Confirm Dyeing Received & Quality Check';
    const isDyeing = action === 'mark_ready';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!metersReceived || !dateReceived || !qualityResult) {
            setError('Please fill all required fields');
            return;
        }

        if (qualityResult === 'fail' && (!failReason || !rejectionMeters)) {
            setError('Please specify the fail reason and rejection meters.');
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
                                onChange={(e) => setMetersReceived(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date Received *</label>
                            <input
                                type="date"
                                value={dateReceived}
                                onChange={(e) => setDateReceived(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Quality Check Result *</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="quality" value="Good" checked={qualityResult === 'Good'} onChange={(e) => setQualityResult(e.target.value)} />
                                Good / Pass
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="quality" value="Minor defects" checked={qualityResult === 'Minor defects'} onChange={(e) => setQualityResult(e.target.value)} />
                                Minor defects / Pass
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="quality" value="fail" checked={qualityResult === 'fail'} onChange={(e) => setQualityResult(e.target.value)} />
                                Major defects / Fail
                            </label>
                        </div>
                    </div>

                    {qualityResult === 'fail' && (
                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
                            <div className={styles.grid}>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.label}>Defect Type *</label>
                                    <select className={styles.select} value={failReason} onChange={e => setFailReason(e.target.value)} required>
                                        <option value="">Select...</option>
                                        <option value="Print misalignment">Print misalignment</option>
                                        <option value="Shade variation">Shade variation</option>
                                        <option value="Fabric defect">Fabric defect</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.label}>Rejection Metres *</label>
                                    <input type="number" min="0" step="0.1" className={styles.input} value={rejectionMeters} onChange={e => setRejectionMeters(e.target.value)} required />
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
