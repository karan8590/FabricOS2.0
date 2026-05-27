import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import styles from './InventoryModals.module.css';

interface Vendor {
    id: number;
    name: string;
    vendor_type?: string;
}

interface AddPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    vendors: Vendor[];
    editingMaterial?: any;
}

export default function AddPurchaseModal({ isOpen, onClose, onSave, vendors: propVendors, editingMaterial }: AddPurchaseModalProps) {
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
    
    // Dynamic Filtered Vendor states
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [vendorSearch, setVendorSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [fetchingVendors, setFetchingVendors] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch vendors dynamically based on category
    useEffect(() => {
        if (!isOpen) return;

        const categoryLower = form.category.toLowerCase();
        let targetType = '';
        if (
            categoryLower.includes('fabric') ||
            categoryLower.includes('polyester') ||
            categoryLower.includes('viscose') ||
            categoryLower.includes('cotton') ||
            categoryLower.includes('yarn')
        ) {
            targetType = 'fabric_supplier';
        } else if (categoryLower.includes('packaging')) {
            targetType = 'packaging';
        } else if (categoryLower.includes('dyeing')) {
            targetType = 'dyeing';
        } else if (categoryLower.includes('embroidery')) {
            targetType = 'embroidery';
        } else if (categoryLower.includes('printing')) {
            targetType = 'printing';
        } else if (categoryLower.includes('transport')) {
            targetType = 'transport';
        }

        const loadVendors = async () => {
            setFetchingVendors(true);
            try {
                const res = await fetch(`/api/vendors?type=${targetType}`);
                if (res.ok) {
                    const data = await res.json();
                    setFilteredVendors(data.vendors || []);
                }
            } catch (err) {
                console.error('Failed to fetch filtered vendors:', err);
            } finally {
                setFetchingVendors(false);
            }
        };

        loadVendors();
    }, [isOpen, form.category]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Memoized filtered vendor search results
    const searchedVendors = useMemo(() => {
        const query = vendorSearch.trim().toLowerCase();
        if (!query) return filteredVendors;
        return filteredVendors.filter(v => v.name.toLowerCase().includes(query));
    }, [filteredVendors, vendorSearch]);

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
            setVendorSearch('');
            setIsDropdownOpen(false);
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
            const vendorName = filteredVendors.find(v => v.id.toString() === form.vendorId)?.name || 'Unknown Vendor';
            
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
                console.log(err.error || 'Failed to save purchase');
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
                <div className={styles.mobileSheetHandle} />
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
                                    <div className={styles.searchableSelectContainer} ref={dropdownRef}>
                                        <button
                                            type="button"
                                            className={`${styles.searchableSelectTrigger} ${errors.vendorId ? styles.inputError : ''} ${editingMaterial ? styles.searchableSelectTriggerDisabled : ''}`}
                                            onClick={() => !editingMaterial && setIsDropdownOpen(!isDropdownOpen)}
                                            disabled={!!editingMaterial}
                                        >
                                            <span>
                                                {form.vendorId 
                                                    ? (filteredVendors.find(v => v.id.toString() === form.vendorId)?.name || 'Loading vendor...')
                                                    : 'Select Vendor...'}
                                            </span>
                                            <ChevronDown size={16} style={{ opacity: 0.6 }} />
                                        </button>
                                        
                                        {isDropdownOpen && !editingMaterial && (
                                            <div className={styles.searchableSelectDropdown}>
                                                <div className={styles.searchableSelectSearchWrapper}>
                                                    <input
                                                        type="text"
                                                        className={styles.searchableSelectSearch}
                                                        placeholder="Search vendor..."
                                                        value={vendorSearch}
                                                        onChange={e => setVendorSearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                {fetchingVendors ? (
                                                    <div className={styles.searchableSelectNoResults}>Loading vendors...</div>
                                                ) : searchedVendors.length === 0 ? (
                                                    <div className={styles.searchableSelectNoResults}>No vendors found</div>
                                                ) : (
                                                    searchedVendors.map(v => (
                                                        <div
                                                            key={v.id}
                                                            className={`${styles.searchableSelectOption} ${form.vendorId === v.id.toString() ? styles.searchableSelectOptionSelected : ''}`}
                                                            onClick={() => {
                                                                setForm({ ...form, vendorId: v.id.toString() });
                                                                setErrors({ ...errors, vendorId: '' });
                                                                setIsDropdownOpen(false);
                                                                setVendorSearch('');
                                                            }}
                                                        >
                                                            <span>{v.name}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
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
