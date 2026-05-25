import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './InventoryModals.module.css'; // Let's use the shared modal styles or create it

interface Vendor {
    id: number;
    name: string;
}

interface AddPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    vendors: Vendor[];
    editingMaterial?: any;
}

export default function AddPurchaseModal({ isOpen, onClose, onSave, vendors, editingMaterial }: AddPurchaseModalProps) {
    const [form, setForm] = useState({
        name: '',
        category: 'Fabric',
        vendorId: '',
        quantityPurchased: '',
        ratePerUnit: '',
        minStock: '',
        invoiceNo: '',
        dueDays: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingMaterial) {
                setForm({
                    name: editingMaterial.name || '',
                    category: editingMaterial.category || 'Fabric',
                    vendorId: editingMaterial.vendor_id?.toString() || '',
                    quantityPurchased: '',
                    ratePerUnit: editingMaterial.rate_per_unit?.toString() || '',
                    minStock: editingMaterial.min_stock?.toString() || '',
                    invoiceNo: '',
                    dueDays: '',
                    purchaseDate: new Date().toISOString().split('T')[0],
                    notes: ''
                });
            } else {
                setForm({
                    name: '', category: 'Fabric', vendorId: '',
                    quantityPurchased: '', ratePerUnit: '', minStock: '', invoiceNo: '', dueDays: '',
                    purchaseDate: new Date().toISOString().split('T')[0], notes: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, editingMaterial]);

    if (!isOpen) return null;

    const totalCost = Number(form.quantityPurchased || 0) * Number(form.ratePerUnit || 0);

    let generatedDueDate = '';
    if (form.purchaseDate && form.dueDays) {
        const pd = new Date(form.purchaseDate);
        if (!isNaN(pd.getTime())) {
            pd.setDate(pd.getDate() + Number(form.dueDays));
            generatedDueDate = pd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!form.vendorId) newErrors.vendorId = 'Vendor is required';
        if (!form.quantityPurchased || Number(form.quantityPurchased) <= 0) newErrors.quantityPurchased = 'Valid quantity is required';
        if (!form.ratePerUnit || Number(form.ratePerUnit) <= 0) newErrors.ratePerUnit = 'Valid rate is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const autoName = `${form.category}`.trim().replace(/\s+/g, ' ');

        let autoUnit = 'm';
        if (form.category === 'Ink') autoUnit = 'L';
        else if (form.category === 'Packaging' || form.category === 'Accessories') autoUnit = 'pcs';

        setLoading(true);
        try {
            const vendorName = vendors.find(v => v.id.toString() === form.vendorId)?.name || 'Unknown Vendor';
            
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_purchase',
                    materialId: editingMaterial?.id,
                    ...form,
                    unit: autoUnit,
                    name: autoName || form.category,
                    vendorName
                })
            });

            if (res.ok) {
                onSave();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save purchase');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{editingMaterial ? 'Add Stock (Existing Material)' : 'Add New Purchase'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                        {/* Basic Info */}
                        <div className={styles.formSection}>
                            <h3>Basic Info</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Category / Fabric Type <span className={styles.req}>*</span></label>
                                    <select 
                                        value={form.category} 
                                        onChange={e => setForm({...form, category: e.target.value})}
                                        disabled={!!editingMaterial}
                                    >
                                        <option value="Fabric">Fabric (Polyester, Cotton, etc.)</option>
                                        <option value="Viscose">Viscose Fabric</option>
                                        <option value="Polyester">Polyester Fabric</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Vendor <span className={styles.req}>*</span></label>
                                    <select 
                                        value={form.vendorId} 
                                        onChange={e => setForm({...form, vendorId: e.target.value})}
                                        className={errors.vendorId ? styles.inputError : ''}
                                        disabled={!!editingMaterial}
                                    >
                                        <option value="">Select Vendor...</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                    {errors.vendorId && <span className={styles.errorText}>{errors.vendorId}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Purchase Details */}
                        <div className={styles.formSection}>
                            <h3>Purchase Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Quantity Purchased <span className={styles.req}>*</span></label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={form.quantityPurchased} 
                                        onChange={e => setForm({...form, quantityPurchased: e.target.value})}
                                        className={errors.quantityPurchased ? styles.inputError : ''}
                                        placeholder={`e.g. 1000`}
                                    />
                                    {errors.quantityPurchased && <span className={styles.errorText}>{errors.quantityPurchased}</span>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Rate Per Unit (₹) <span className={styles.req}>*</span></label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={form.ratePerUnit} 
                                        onChange={e => setForm({...form, ratePerUnit: e.target.value})}
                                        className={errors.ratePerUnit ? styles.inputError : ''}
                                    />
                                    {errors.ratePerUnit && <span className={styles.errorText}>{errors.ratePerUnit}</span>}
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Purchase Date <span className={styles.req}>*</span></label>
                                    <input 
                                        type="date" 
                                        value={form.purchaseDate} 
                                        onChange={e => setForm({...form, purchaseDate: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Invoice Number</label>
                                    <input 
                                        type="text" 
                                        value={form.invoiceNo} 
                                        onChange={e => setForm({...form, invoiceNo: e.target.value})}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Payment Due In (Days)</label>
                                    <input 
                                        type="number" 
                                        value={form.dueDays} 
                                        onChange={e => setForm({...form, dueDays: e.target.value})}
                                        placeholder="e.g. 30"
                                    />
                                    <p className={styles.helperText} style={{ marginTop: '6px', marginBottom: '0' }}>
                                        Vendor payment due period from purchase date
                                    </p>
                                    {generatedDueDate && (
                                        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            Payment Due Date: <strong style={{ color: 'var(--text-primary)' }}>{generatedDueDate}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Reorder Level (Min Stock)</label>
                                    <input 
                                        type="number" 
                                        value={form.minStock} 
                                        onChange={e => setForm({...form, minStock: e.target.value})}
                                        placeholder="e.g. 50"
                                        disabled={!!editingMaterial}
                                    />
                                </div>
                            </div>

                            <div className={styles.totalCostCard}>
                                <span>Total Auto-Calculated Cost:</span>
                                <strong>₹{totalCost.toLocaleString('en-IN')}</strong>
                            </div>
                            <p className={styles.helperText}>
                                Saving will automatically increase inventory stock, record ₹{totalCost.toLocaleString('en-IN')} to cashbook, and add payable to vendor ledger.
                            </p>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.btnSubmit} disabled={loading}>
                            {loading ? 'Saving...' : 'Confirm Purchase'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
