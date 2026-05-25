import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Plus } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';

interface SendToVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    orders: any[];
    action: 'send_to_embroidery' | 'send_to_dyeing';
}

export default function SendToVendorModal({ isOpen, onClose, onSuccess, orders, action }: SendToVendorModalProps) {
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [rate, setRate] = useState<string>('');
    const [meters, setMeters] = useState<string>('');
    const [expectedDate, setExpectedDate] = useState<string>('');
    const [daysUntilDue, setDaysUntilDue] = useState<string>('7');
    const [generateChallan, setGenerateChallan] = useState(true);
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    // New Vendor State
    const [isCreatingVendor, setIsCreatingVendor] = useState(false);
    const isEmbroidery = action === 'send_to_embroidery';
    const themeColor = isEmbroidery ? '#A855F7' : '#0EA5E9';
    const [newVendor, setNewVendor] = useState({ name: '', type: isEmbroidery ? 'embroidery' : 'dyeing', phone: '', gst: '', address: '', notes: '' });
    const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && orders && orders.length > 0) {
            const totalMeters = orders.reduce((sum, o) => sum + Number(o.quantity_meters || 0), 0);
            setMeters(totalMeters.toString());
            setRate('');
            setSelectedVendorId('');
            setNotes('');
            setError('');
            setErrors({});
            setGenerateChallan(true);
            setIsCreatingVendor(false);
            setNewVendor({ name: '', type: isEmbroidery ? 'embroidery' : 'dyeing', phone: '', gst: '', address: '', notes: '' });
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const eYear = tomorrow.getFullYear();
            const eMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const eDay = String(tomorrow.getDate()).padStart(2, '0');
            setExpectedDate(`${eYear}-${eMonth}-${eDay}`);

            setDaysUntilDue('7');
            
            fetchVendors();
        }
    }, [isOpen, orders, action]);

    const fetchVendors = () => {
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
    };

    if (!isOpen || !orders || orders.length === 0 || !mounted) return null;

    const title = isEmbroidery ? 'Send to Embroidery Vendor' : 'Send to Dyeing Vendor';
    const parsedRate = parseFloat(rate) || 0;
    const parsedMeters = parseFloat(meters) || 0;
    const totalCost = (!isNaN(parsedRate) && !isNaN(parsedMeters)) ? (parsedRate * parsedMeters).toFixed(2) : '0.00';

    let calculatedPaymentDueDate = new Date();
    const days = parseInt(daysUntilDue) || 0;
    calculatedPaymentDueDate.setDate(calculatedPaymentDueDate.getDate() + days);

    const localYear = calculatedPaymentDueDate.getFullYear();
    const localMonth = String(calculatedPaymentDueDate.getMonth() + 1).padStart(2, '0');
    const localDay = String(calculatedPaymentDueDate.getDate()).padStart(2, '0');
    const formattedCalculatedDueDate = `${localYear}-${localMonth}-${localDay}`;
    const displayCalculatedDueDate = calculatedPaymentDueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!selectedVendorId) newErrors.vendorId = 'Vendor selection is required';
        if (!rate || parseFloat(rate) <= 0) newErrors.rate = 'Rate is required and must be greater than 0';
        if (!meters || parseFloat(meters) <= 0) newErrors.meters = 'Meters is required and must be greater than 0';
        if (!expectedDate) newErrors.expectedDate = 'Expected return date is required';
        
        const parsedDays = parseInt(daysUntilDue);
        if (!daysUntilDue || isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
            newErrors.daysUntilDue = 'Must be between 1 and 365 days';
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
            const res = await fetch('/api/orders/bulk-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: orders.map(o => o.id),
                    action,
                    vendorId: selectedVendorId,
                    rate: parsedRate,
                    expectedReturnDate: expectedDate,
                    paymentDueDate: formattedCalculatedDueDate,
                    notes,
                    generateChallan
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

    const handleCreateVendor = async () => {
        const newErrors: Record<string, string> = {};
        if (!newVendor.name?.trim()) newErrors.vendorName = 'Vendor name is required';
        if (newVendor.phone?.trim() && !/^\d{10}$/.test(newVendor.phone.trim())) newErrors.vendorPhone = 'Mobile number must be 10 digits';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setIsSubmittingVendor(true);
        setError('');
        try {
            const res = await fetch('/api/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newVendor.name.trim(),
                    vendorType: newVendor.type,
                    contact: newVendor.phone.trim() || 'N/A', // contact is required by backend
                    materialSupplied: newVendor.type === 'embroidery' ? 'Embroidery Service' : 'Dyeing Service', // material_supplied is required
                    balance: 0,
                    gstNo: newVendor.gst.trim().toUpperCase() || null,
                    // Note: Address and notes are not currently saved in POST /api/vendors by default,
                    // but we can send them if backend supports them later.
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create vendor');
            }
            const data = await res.json();
            // API returns { success, vendorId, vendor } — vendor is the full object
            const created = data.vendor || {
                id: Number(data.vendorId),
                name: newVendor.name.trim(),
                contact: newVendor.phone.trim() || 'N/A',
                material_supplied: newVendor.type === 'embroidery' ? 'Embroidery Service' : 'Dyeing Service',
                balance: 0,
                vendor_type: newVendor.type,
            };

            if (!created.id) {
                throw new Error('Failed to get vendor ID from server response');
            }

            // Add and select
            setVendors(prev => [...prev, created]);
            setSelectedVendorId(created.id.toString());
            setIsCreatingVendor(false);
            setNewVendor({ name: '', type: isEmbroidery ? 'embroidery' : 'dyeing', phone: '', gst: '', address: '', notes: '' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmittingVendor(false);
        }
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.title}>{isCreatingVendor ? 'Add New Vendor' : title}</h2>
                        <p className={styles.subtitle}>
                            {isCreatingVendor ? 'Create a new vendor profile' : `${orders.length} orders selected`}
                        </p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className={styles.errorBox} style={{ margin: '16px 24px 0', padding: '12px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '13px' }}>
                        {error}
                    </div>
                )}

                {isCreatingVendor ? (
                    <div className={styles.formBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Vendor Name *</label>
                            <input 
                                type="text" 
                                value={newVendor.name} 
                                onChange={e => { setNewVendor({...newVendor, name: e.target.value}); setErrors({...errors, vendorName: ''}); }} 
                                className={`${styles.input} ${errors.vendorName ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`} 
                                data-error={!!errors.vendorName}
                                autoFocus 
                            />
                            {errors.vendorName && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.vendorName}</p>}
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Work Type</label>
                                <select value={newVendor.type} onChange={e => setNewVendor({...newVendor, type: e.target.value})} className={styles.select}>
                                    <option value="embroidery">Embroidery</option>
                                    <option value="dyeing">Dyeing</option>
                                    <option value="Job Worker">Job Worker</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Mobile</label>
                                <input 
                                    type="text" 
                                    value={newVendor.phone} 
                                    onChange={e => { setNewVendor({...newVendor, phone: e.target.value}); setErrors({...errors, vendorPhone: ''}); }} 
                                    className={`${styles.input} ${errors.vendorPhone ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`} 
                                    data-error={!!errors.vendorPhone}
                                />
                                {errors.vendorPhone && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.vendorPhone}</p>}
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>GST Number</label>
                            <input type="text" value={newVendor.gst} onChange={e => setNewVendor({...newVendor, gst: e.target.value})} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Address</label>
                            <textarea value={newVendor.address} onChange={e => setNewVendor({...newVendor, address: e.target.value})} className={styles.textarea} rows={2} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Notes</label>
                            <textarea value={newVendor.notes} onChange={e => setNewVendor({...newVendor, notes: e.target.value})} className={styles.textarea} rows={2} />
                        </div>
                        <div className={styles.formFooter}>
                            <button type="button" className={styles.btnCancel} onClick={() => setIsCreatingVendor(false)}>Cancel</button>
                            <button type="button" className={styles.btnSubmit} onClick={handleCreateVendor} disabled={isSubmittingVendor} style={{ background: themeColor, color: 'white', border: 'none' }}>
                                {isSubmittingVendor ? 'Creating...' : 'Create Vendor'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.formBody}>
                        <div className={styles.formGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className={styles.label} style={{ margin: 0 }}>Select Vendor *</label>
                                <button type="button" onClick={() => setIsCreatingVendor(true)} style={{ background: 'none', border: 'none', color: themeColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Plus size={14} /> Add New Vendor
                                </button>
                            </div>
                            {vendors.length === 0 ? (
                                <div style={{ padding: '16px', background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '12px', textAlign: 'center', fontSize: '14px', color: '#4B5563' }}>
                                    No vendors found. <button type="button" onClick={() => setIsCreatingVendor(true)} style={{ color: themeColor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Create one now</button>.
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={selectedVendorId}
                                        onChange={(e) => { setSelectedVendorId(e.target.value); setErrors({...errors, vendorId: ''}); }}
                                        className={`${styles.select} ${errors.vendorId ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                        data-error={!!errors.vendorId}
                                    >
                                        <option value="">Choose a vendor...</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                    {errors.vendorId && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.vendorId}</p>}
                                </>
                            )}
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Metres Sent *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={meters}
                                    onChange={(e) => { setMeters(e.target.value); setErrors({...errors, meters: ''}); }}
                                    className={`${styles.input} ${errors.meters ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                    data-error={!!errors.meters}
                                />
                                {errors.meters && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.meters}</p>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Rate per Metre (₹) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={rate}
                                    onChange={(e) => { setRate(e.target.value); setErrors({...errors, rate: ''}); }}
                                    className={`${styles.input} ${errors.rate ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                    placeholder="e.g. 12.50"
                                    data-error={!!errors.rate}
                                />
                                {errors.rate && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.rate}</p>}
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
                                    value={(() => {
                                        const n = new Date();
                                        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                                    })()}
                                    disabled
                                    className={styles.input}
                                    style={{ background: '#F3F4F6' }}
                                />
                            </div>
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Expected Return Date *</label>
                                <input
                                    type="date"
                                    value={expectedDate}
                                    onChange={(e) => { setExpectedDate(e.target.value); setErrors({...errors, expectedDate: ''}); }}
                                    className={`${styles.input} ${errors.expectedDate ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                    data-error={!!errors.expectedDate}
                                />
                                {errors.expectedDate && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.expectedDate}</p>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Days Until Due *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={daysUntilDue}
                                    onChange={(e) => { setDaysUntilDue(e.target.value); setErrors({...errors, daysUntilDue: ''}); }}
                                    className={`${styles.input} ${errors.daysUntilDue ? 'border-red-400 focus:ring-red-500 bg-red-50/30' : ''}`}
                                    placeholder="e.g. 7"
                                    data-error={!!errors.daysUntilDue}
                                />
                                {errors.daysUntilDue ? (
                                    <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.daysUntilDue}</p>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Payment Due On: <strong style={{ color: 'var(--text-primary)' }}>{displayCalculatedDueDate}</strong>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                            <input
                                type="checkbox"
                                id="generateChallan"
                                checked={generateChallan}
                                onChange={(e) => setGenerateChallan(e.target.checked)}
                                style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: themeColor }}
                            />
                            <label htmlFor="generateChallan" className={styles.label} style={{ margin: 0, cursor: 'pointer', fontSize: '13px' }}>
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
                            <button type="submit" className={styles.btnSubmit} disabled={isSubmitting} style={{ background: themeColor, color: 'white', border: 'none' }}>
                                {isSubmitting ? <span className="ti ti-loader ti-spin"></span> : <Send size={16} />}
                                {isSubmitting ? ' Sending...' : ' Send to Vendor'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
