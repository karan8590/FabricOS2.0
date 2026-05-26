import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';

interface ProductionWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
    action: 'send_to_embroidery' | 'send_to_dyeing';
}

export default function ProductionWorkflowModal({ isOpen, onClose, onSuccess, order, action }: ProductionWorkflowModalProps) {
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [rate, setRate] = useState<string>('');
    const [meters, setMeters] = useState<string>('');
    const [expectedDate, setExpectedDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && order) {
            setMeters(order.quantity_meters?.toString() || '');
            setRate('');
            setSelectedVendorId('');
            setNotes('');
            setError('');
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setExpectedDate(tomorrow.toISOString().split('T')[0]);
            
            fetch('/api/vendors')
                .then(res => res.json())
                .then(data => {
                    if (data.vendors) {
                        setVendors(data.vendors);
                    }
                })
                .catch(console.error);
        }
    }, [isOpen, order]);

    if (!isOpen || !order || !mounted) return null;

    const isEmbroidery = action === 'send_to_embroidery';
    const title = isEmbroidery ? 'Send to Embroidery' : 'Send to Dyeing';
    
    const parsedRate = parseFloat(rate) || 0;
    const parsedMeters = parseFloat(meters) || 0;
    const totalCost = (parsedRate * parsedMeters).toFixed(2);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendorId || !rate || !meters || !expectedDate) {
            setError('Please fill all required fields');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    vendorId: parseInt(selectedVendorId),
                    rate: parsedRate,
                    metres: parsedMeters,
                    expectedReturnDate: expectedDate,
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

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Select Vendor *</label>
                        <select
                            value={selectedVendorId}
                            onChange={(e) => setSelectedVendorId(e.target.value)}
                            className={styles.select}
                            required
                        >
                            <option value="">Choose a vendor...</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Rate per Meter (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className={styles.input}
                                required
                                placeholder="e.g. 12.50"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Total Meters *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={meters}
                                onChange={(e) => setMeters(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Expected Return Date *</label>
                            <input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Auto Total (₹)</label>
                            <div className={styles.autoTotalBox}>
                                ₹{totalCost}
                            </div>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={styles.textarea}
                            rows={2}
                            placeholder="Add any specific instructions for the vendor..."
                        />
                    </div>

                    <div className={styles.formFooter}>
                        <button type="button" className={styles.workflowSecondary} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={action === 'send_to_embroidery' ? styles.btnPurple : styles.btnCyan} disabled={isSubmitting}>
                            <Send size={16} />
                            {isSubmitting ? 'Sending...' : 'Send Fabric'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
