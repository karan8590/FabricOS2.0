"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';

interface CompletePrintingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
}

export default function CompletePrintingModal({ isOpen, onClose, onSuccess, order }: CompletePrintingModalProps) {
    const [mounted, setMounted] = useState(false);
    const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_printing',
                    completionDate
                })
            });

            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to complete printing');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const vendorName = order.embroidery_vendor_name || order.printing_vendor_name || 'In-House / Unknown';

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className={styles.mobileSheetHandle} />
                <div className={styles.modalHeader}>
                    <div className={styles.headerLeft} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className={styles.iconWrapper} style={{ backgroundColor: '#F0F9FF', color: '#0EA5E9', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <Check size={20} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Complete Mark Printing</h2>
                            <p className={styles.subtitle}>Confirm printing completion and move order to dyeing workflow</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.formBody}>
                    {error && (
                        <div className={styles.errorBox}>
                            {error}
                        </div>
                    )}

                    {/* SECTION 1 — Printing Summary */}
                    <div className={styles.section} style={{ marginBottom: '20px' }}>
                        <h3 className={styles.sectionTitle} style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Printing Summary</h3>
                        <div className={styles.grid} style={{ gap: '12px' }}>
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Order ID</label>
                                <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{order.order_number || order.id}</div>
                            </div>
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Customer Name</label>
                                <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{order.customer_name}</div>
                            </div>
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Design Name</label>
                                <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{order.design_name}</div>
                            </div>
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Quantity</label>
                                <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{order.quantity_meters || order.quantity} Mtr</div>
                            </div>
                            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Printing Vendor</label>
                                <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{vendorName}</div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2 — Completion Details */}
                    <div className={styles.section} style={{ paddingTop: '16px', borderTop: '1px solid #E5E7EB', marginBottom: '8px' }}>
                        <h3 className={styles.sectionTitle} style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Details</h3>
                        <div className={styles.grid} style={{ alignItems: 'flex-start' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Completion Date *</label>
                                <input 
                                    type="date" 
                                    className={styles.input} 
                                    value={completionDate}
                                    onChange={(e) => setCompletionDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.formFooter} style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                    <button 
                        className={styles.workflowSecondary} 
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{ margin: 0, padding: '8px 16px', fontWeight: 500, fontSize: '14px', height: '40px' }}
                    >
                        Cancel
                    </button>
                    <button 
                        className={styles.btnOrange} 
                        style={{ margin: 0, padding: '8px 16px', fontWeight: 500, fontSize: '14px', height: '40px', width: 'auto' }}
                        onClick={handleSubmit}
                        disabled={isSubmitting || !completionDate}
                    >
                        {isSubmitting ? 'Completing...' : 'Complete & Move To Dyeing'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
