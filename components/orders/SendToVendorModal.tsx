import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';

interface SendToVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
    action: 'send_to_embroidery' | 'send_to_dyeing';
}

export default function SendToVendorModal({ isOpen, onClose, onSuccess, order, action }: SendToVendorModalProps) {
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [rate, setRate] = useState<string>('');
    const [meters, setMeters] = useState<string>('');
    const [expectedDate, setExpectedDate] = useState<string>('');
    const [paymentDueDate, setPaymentDueDate] = useState<string>('');
    const [generateChallan, setGenerateChallan] = useState(true);
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
            setGenerateChallan(true);
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setExpectedDate(tomorrow.toISOString().split('T')[0]);

            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setPaymentDueDate(nextWeek.toISOString().split('T')[0]);
            
            fetch('/api/vendors')
                .then(res => res.json())
                .then(data => {
                    if (data.vendors) {
                        setVendors(data.vendors.filter((v: any) => 
                            action === 'send_to_embroidery' 
                                ? v.vendor_type?.toLowerCase().includes('embroidery') || v.vendor_type === 'Job Worker'
                                : v.vendor_type?.toLowerCase().includes('dyeing') || v.vendor_type === 'Job Worker'
                        ));
                    }
                })
                .catch(console.error);
        }
    }, [isOpen, order, action]);

    if (!isOpen || !order || !mounted) return null;

    const isEmbroidery = action === 'send_to_embroidery';
    const title = isEmbroidery ? 'Send to Embroidery Vendor' : 'Send to Dyeing Vendor';
    
    const parsedRate = parseFloat(rate) || 0;
    const parsedMeters = parseFloat(meters) || 0;
    const totalCost = (parsedRate * parsedMeters).toFixed(2);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendorId || !rate || !meters || !expectedDate || !paymentDueDate) {
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
                    paymentDueDate,
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
                            <label className={styles.label}>Metres Sent *</label>
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
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Rate per Metre (₹) *</label>
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
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Auto Total (₹)</label>
                            <div className={styles.autoTotalBox}>
                                ₹{totalCost}
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date Sent</label>
                            <input
                                type="date"
                                value={new Date().toISOString().split('T')[0]}
                                disabled
                                className={styles.input}
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
                            <label className={styles.label}>Payment Due Date *</label>
                            <input
                                type="date"
                                value={paymentDueDate}
                                onChange={(e) => setPaymentDueDate(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            id="generateChallan"
                            checked={generateChallan}
                            onChange={(e) => setGenerateChallan(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="generateChallan" className={styles.label} style={{ margin: 0, cursor: 'pointer' }}>
                            Generate job work challan PDF automatically
                        </label>
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
                        <button type="button" className={styles.btnCancel} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                            <Send size={16} />
                            {isSubmitting ? 'Sending...' : 'Send to Vendor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
