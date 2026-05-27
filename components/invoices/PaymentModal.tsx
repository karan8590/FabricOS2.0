'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import styles from './PaymentModal.module.css';
import { celebrateBig } from '@/lib/confetti';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { amount: number; date: string; notes: string }) => Promise<void>;
    invoice: any;
}

export default function PaymentModal({ isOpen, onClose, onSave, invoice }: PaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen && invoice) {
            // Default amount to remaining balance
            const paid = invoice.amount_paid || 0;
            const remaining = Math.max(0, invoice.amount - paid);
            setAmount(remaining.toString());
            setAmount(remaining.toString());
            setDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setErrors({});
        }
    }, [isOpen, invoice]);

    if (!isOpen || !invoice) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const paid = invoice.amount_paid || 0;
        const remaining = Math.max(0, invoice.amount - paid);

        const newErrors: Record<string, string> = {};
        if (!amount || parseFloat(amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        } else if (parseFloat(amount) > remaining) {
            newErrors.amount = 'Amount cannot exceed remaining balance';
        }

        if (!date) newErrors.date = 'Date is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setLoading(true);
        try {
            await onSave({
                amount: parseFloat(amount),
                date,
                notes
            });
            
            const paid = invoice.amount_paid || 0;
            const remaining = Math.max(0, invoice.amount - paid);
            const newRemaining = Math.max(0, remaining - (parseFloat(amount) || 0));
            if (newRemaining <= 0) {
                celebrateBig(`confetti_invoice_${invoice.id}`);
            }
            
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const paid = invoice.amount_paid || 0;
    const remaining = Math.max(0, invoice.amount - paid);
    const newRemaining = Math.max(0, remaining - (parseFloat(amount) || 0));

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.mobileSheetHandle} />
                <div className={styles.header}>
                    <h2 className={styles.title}>Record Payment</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.body}>
                        <div className={styles.summary}>
                            <div className={styles.summaryRow}>
                                <span>Total Invoice Amount</span>
                                <span>₹{invoice.amount.toLocaleString()}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Already Paid</span>
                                <span>₹{paid.toLocaleString()}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Remaining Balance</span>
                                <span>₹{remaining.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Payment Amount (₹)</label>
                            <input
                                type="number"
                                className={`${styles.input} ${errors.amount ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                value={amount}
                                onChange={e => { setAmount(e.target.value); setErrors(prev => ({...prev, amount: ''})); }}
                                min="1"
                                max={remaining}
                                step="any"
                                autoFocus
                                inputMode="decimal"
                                data-error={!!errors.amount}
                            />
                            {errors.amount && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.amount}</p>}
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Payment Date</label>
                            <input
                                type="date"
                                className={`${styles.input} ${errors.date ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                value={date}
                                onChange={e => { setDate(e.target.value); setErrors(prev => ({...prev, date: ''})); }}
                                data-error={!!errors.date}
                            />
                            {errors.date && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.date}</p>}
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Notes (Optional)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Cheque number, transaction ID..."
                            />
                        </div>

                        <div className={styles.summary} style={{ marginBottom: 0, marginTop: 'var(--spacing-4)', background: 'var(--color-bg-elevated)' }}>
                            <div className={styles.summaryRow} style={{ color: 'var(--color-text-primary)' }}>
                                <span>Balance After Payment</span>
                                <span style={{ color: 'var(--color-success)' }}>₹{newRemaining.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <Button variant="ghost" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Recording...' : 'Record Payment'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
