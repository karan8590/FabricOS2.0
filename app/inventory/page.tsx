'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './Inventory.module.css';
import ReorderSuggestions from './ReorderSuggestions';
import { AlertTriangle } from 'lucide-react';

interface Vendor {
    id: number;
    name: string;
    contact: string;
    city?: string;
    gst_no?: string;
}

interface Design {
    id: number;
    name: string;
}

interface FabricRecord {
    id: number;
    designName: string;
    vendorId: number;
    vendorName: string;
    metresOrdered: number;
    metresReceived: number;
    metresUsed: number;
    balance: number;
    purchaseCost: number;
    ratePerMetre: number;
    linkedOrderNo: string | null;
    purchaseDate: string;
    invoiceNo: string | null;
    notes: string | null;
}

interface InkRecord {
    id: number;
    inkColour: string;
    quantity: number;
    unit: 'L' | 'kg';
    supplier: string;
    purchaseDate: string;
    costPerUnit: number;
    currentBalance: number;
    minStock?: number;
    lastAlertSent?: number;
}

interface PackagingRecord {
    id: number;
    itemName: string;
    type: 'Roll' | 'Cover' | 'Tag';
    quantity: number;
    supplier: string;
    purchaseDate: string;
    cost: number;
    currentStock: number;
    minStock?: number;
    lastAlertSent?: number;
}

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'fabric' | 'ink' | 'packaging' | 'reorder'>('fabric');
    const [data, setData] = useState<any[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);

    // --- MODALS TOGGLES ---
    const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
    const [isInkModalOpen, setIsInkModalOpen] = useState(false);
    const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isDeductInkModalOpen, setIsDeductInkModalOpen] = useState(false);

    // --- EDITING ITEM SELECTION ---
    const [editingItem, setEditingItem] = useState<any>(null);

    // --- FORM DATA STATES ---
    const [fabricForm, setFabricForm] = useState({
        designName: '',
        vendorId: '',
        metresOrdered: '',
        metresReceived: '',
        ratePerMetre: '',
        linkedOrderNo: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        invoiceNo: '',
        notes: '',
        metresUsed: '0'
    });

    const [inkForm, setInkForm] = useState({
        inkColour: '',
        quantity: '',
        unit: 'L' as 'L' | 'kg',
        supplier: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        costPerUnit: '',
        currentBalance: ''
    });

    const [packagingForm, setPackagingForm] = useState({
        itemName: '',
        type: 'Roll' as 'Roll' | 'Cover' | 'Tag',
        quantity: '',
        supplier: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        cost: '',
        currentStock: ''
    });

    const [vendorForm, setVendorForm] = useState({
        name: '',
        contact: '',
        city: '',
        gstNo: ''
    });

    const [deductForm, setDeductForm] = useState({
        deductAmount: '',
        reason: ''
    });

    const [selectedInkForDeduct, setSelectedInkForDeduct] = useState<InkRecord | null>(null);
    const [fabricErrors, setFabricErrors] = useState<Record<string, string>>({});
    const [inkErrors, setInkErrors] = useState<Record<string, string>>({});
    const [packagingErrors, setPackagingErrors] = useState<Record<string, string>>({});

    // --- LOAD DATA ---
    useEffect(() => {
        fetchInventory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory?tab=${activeTab}`);
            if (res.ok) {
                const body = await res.json();
                setData(body.data || []);
                setVendors(body.vendors || []);
                setDesigns(body.designs || []);
            }
        } catch (error) {
            console.error('Failed to load inventory data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMinStock = async (id: number, type: 'ink' | 'packaging', minStock: number) => {
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: `update_min_stock_${type}`, id, minStock })
            });
            if (res.ok) {
                fetchInventory();
            }
        } catch (e) { console.error('Failed to update min stock', e); }
    };

    const lowStockItems = useMemo(() => {
        const items: string[] = [];
        if (activeTab === 'ink' || activeTab === 'packaging') {
            data.forEach(d => {
                if (d.minStock !== undefined) {
                    if (d.inkColour && d.currentBalance <= d.minStock) {
                        items.push(`${d.inkColour} ink (${d.currentBalance}${d.unit} remaining)`);
                    } else if (d.itemName && d.currentStock <= d.minStock) {
                        items.push(`${d.itemName} (${d.currentStock} units)`);
                    }
                }
            });
        }
        return items;
    }, [data, activeTab]);

    const [dismissedAlerts, setDismissedAlerts] = useState(false);

    // --- OPEN ADD MODALS ---
    const handleOpenAddFabric = () => {
        setEditingItem(null);
        setFabricForm({
            designName: '',
            vendorId: '',
            metresOrdered: '',
            metresReceived: '',
            ratePerMetre: '',
            linkedOrderNo: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            invoiceNo: '',
            notes: '',
            metresUsed: '0'
        });
        setFabricErrors({});
        setIsFabricModalOpen(true);
    };

    const handleOpenAddInk = () => {
        setEditingItem(null);
        setInkForm({
            inkColour: '',
            quantity: '',
            unit: 'L',
            supplier: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            costPerUnit: '',
            currentBalance: ''
        });
        setIsInkModalOpen(true);
    };

    const handleOpenAddPackaging = () => {
        setEditingItem(null);
        setPackagingForm({
            itemName: '',
            type: 'Roll',
            quantity: '',
            supplier: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            cost: '',
            currentStock: ''
        });
        setIsPackagingModalOpen(true);
    };

    // --- EDIT HANDLERS ---
    const handleOpenEditFabric = (item: FabricRecord) => {
        setEditingItem(item);
        setFabricForm({
            designName: item.designName,
            vendorId: String(item.vendorId),
            metresOrdered: String(item.metresOrdered),
            metresReceived: String(item.metresReceived),
            ratePerMetre: String(item.ratePerMetre),
            linkedOrderNo: item.linkedOrderNo || '',
            purchaseDate: item.purchaseDate,
            invoiceNo: item.invoiceNo || '',
            notes: item.notes || '',
            metresUsed: String(item.metresUsed)
        });
        setIsFabricModalOpen(true);
    };

    const handleOpenEditInk = (item: InkRecord) => {
        setEditingItem(item);
        setInkForm({
            inkColour: item.inkColour,
            quantity: String(item.quantity),
            unit: item.unit,
            supplier: item.supplier,
            purchaseDate: item.purchaseDate,
            costPerUnit: String(item.costPerUnit),
            currentBalance: String(item.currentBalance)
        });
        setIsInkModalOpen(true);
    };

    const handleOpenEditPackaging = (item: PackagingRecord) => {
        setEditingItem(item);
        setPackagingForm({
            itemName: item.itemName,
            type: item.type,
            quantity: String(item.quantity),
            supplier: item.supplier,
            purchaseDate: item.purchaseDate,
            cost: String(item.cost),
            currentStock: String(item.currentStock)
        });
        setIsPackagingModalOpen(true);
    };

    // --- SUBMIT SAVE HANDLERS ---
    const handleSaveFabric = async (e: React.FormEvent) => {
        e.preventDefault();
        const action = editingItem ? 'edit_fabric' : 'add_fabric';

        const newErrors: Record<string, string> = {};
        if (!fabricForm.vendorId) newErrors.vendorId = 'Please select a vendor';
        if (!fabricForm.designName?.trim()) newErrors.designName = 'Design name is required';
        if (!fabricForm.metresOrdered || parseFloat(fabricForm.metresOrdered) <= 0) newErrors.metresOrdered = 'Metres ordered is required';
        if (!fabricForm.metresReceived) newErrors.metresReceived = 'Metres received is required';
        if (!fabricForm.ratePerMetre || parseFloat(fabricForm.ratePerMetre) <= 0) newErrors.ratePerMetre = 'Rate per metre is required';

        if (Object.keys(newErrors).length > 0) {
            setFabricErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    id: editingItem?.id,
                    ...fabricForm,
                    vendorId: parseInt(fabricForm.vendorId),
                    metresOrdered: parseFloat(fabricForm.metresOrdered),
                    metresReceived: parseFloat(fabricForm.metresReceived),
                    ratePerMetre: parseFloat(fabricForm.ratePerMetre),
                    metresUsed: parseFloat(fabricForm.metresUsed || '0')
                })
            });

            if (res.ok) {
                setIsFabricModalOpen(false);
                setFabricErrors({});
                fetchInventory();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save fabric purchase');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveInk = async (e: React.FormEvent) => {
        e.preventDefault();
        const action = editingItem ? 'edit_ink' : 'add_ink';

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    id: editingItem?.id,
                    ...inkForm,
                    quantity: parseFloat(inkForm.quantity),
                    costPerUnit: parseFloat(inkForm.costPerUnit),
                    currentBalance: parseFloat(inkForm.currentBalance || inkForm.quantity)
                })
            });

            if (res.ok) {
                setIsInkModalOpen(false);
                fetchInventory();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save ink stock');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSavePackaging = async (e: React.FormEvent) => {
        e.preventDefault();
        const action = editingItem ? 'edit_packaging' : 'add_packaging';

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    id: editingItem?.id,
                    ...packagingForm,
                    quantity: parseFloat(packagingForm.quantity),
                    cost: parseFloat(packagingForm.cost),
                    currentStock: parseFloat(packagingForm.currentStock || packagingForm.quantity)
                })
            });

            if (res.ok) {
                setIsPackagingModalOpen(false);
                fetchInventory();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save packaging stock');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- NEW VENDOR SUBMISSION ---
    const handleSaveVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_vendor',
                    ...vendorForm
                })
            });

            if (res.ok) {
                const body = await res.json();
                const newVendor: Vendor = body.vendor;
                
                // Refresh list
                setVendors(prev => [...prev, newVendor].sort((a, b) => a.name.localeCompare(b.name)));
                
                // Auto-select in form
                setFabricForm(prev => ({ ...prev, vendorId: String(newVendor.id) }));
                
                // Close modal
                setIsVendorModalOpen(false);
                setVendorForm({ name: '', contact: '', city: '', gstNo: '' });
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create vendor');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- DELETE HANDLER ---
    const handleDeleteItem = async (id: number) => {
        if (!confirm('Are you sure you want to delete this inventory record?')) return;

        const action = activeTab === 'fabric'
            ? 'delete_fabric'
            : activeTab === 'ink'
            ? 'delete_ink'
            : 'delete_packaging';

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, id })
            });

            if (res.ok) {
                fetchInventory();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete record');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- INK DEDUCTION ACTION ---
    const handleOpenDeductInk = (item: InkRecord) => {
        setSelectedInkForDeduct(item);
        setDeductForm({ deductAmount: '', reason: '' });
        setIsDeductInkModalOpen(true);
    };

    const handleSaveDeductInk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInkForDeduct) return;

        const amt = parseFloat(deductForm.deductAmount);
        if (isNaN(amt) || amt <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const newBal = selectedInkForDeduct.currentBalance - amt;
        if (newBal < 0) {
            alert('Cannot deduct more than the current available balance');
            return;
        }

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'edit_ink',
                    id: selectedInkForDeduct.id,
                    inkColour: selectedInkForDeduct.inkColour,
                    quantity: selectedInkForDeduct.quantity,
                    unit: selectedInkForDeduct.unit,
                    supplier: selectedInkForDeduct.supplier,
                    purchaseDate: selectedInkForDeduct.purchaseDate,
                    costPerUnit: selectedInkForDeduct.costPerUnit,
                    currentBalance: newBal
                })
            });

            if (res.ok) {
                setIsDeductInkModalOpen(false);
                fetchInventory();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to log ink deduction');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- FABRIC VENDOR STATS (BELOW TABLE SUMMARY) ---
    const computeVendorFabricStats = () => {
        if (activeTab !== 'fabric') return [];

        const statsMap = new Map<string, { meters: number; cost: number }>();
        const fabricRecords = data as FabricRecord[];

        fabricRecords.forEach(rec => {
            const vName = rec.vendorName || 'Unknown Vendor';
            const existing = statsMap.get(vName) || { meters: 0, cost: 0 };
            statsMap.set(vName, {
                meters: existing.meters + rec.metresReceived,
                cost: existing.cost + rec.purchaseCost
            });
        });

        return Array.from(statsMap.entries()).map(([vendorName, stats]) => ({
            vendorName,
            ...stats
        }));
    };

    const vendorStats = computeVendorFabricStats();

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Inventory Management</h1>
                    <p className={styles.subtitle}>Track raw materials, printing inks, and packaging stock</p>
                </div>
            </div>

            {/* Low Stock Banner */}
            {lowStockItems.length > 0 && !dismissedAlerts && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C' }}>
                        <AlertTriangle size={16} />
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Stock alert: {lowStockItems.length} items are running low.</span>
                        <span style={{ fontSize: '13px', marginLeft: '8px' }}>{lowStockItems.join(', ')}</span>
                    </div>
                    <button onClick={() => setDismissedAlerts(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', fontSize: '18px', fontWeight: 'bold' }}>×</button>
                </div>
            )}

            {/* Sub-tabs */}
            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'fabric' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('fabric')}
                >
                    Embroidery Fabric
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'ink' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('ink')}
                    style={{ position: 'relative' }}
                >
                    Printing Ink
                    {lowStockItems.length > 0 && activeTab === 'ink' && <span style={{ position: 'absolute', top: '10px', right: '12px', width: '8px', height: '8px', background: '#ff3b30', borderRadius: '50%' }}></span>}
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'packaging' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('packaging')}
                    style={{ position: 'relative' }}
                >
                    Packaging
                    {lowStockItems.length > 0 && activeTab === 'packaging' && <span style={{ position: 'absolute', top: '10px', right: '12px', width: '8px', height: '8px', background: '#ff3b30', borderRadius: '50%' }}></span>}
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'reorder' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('reorder')}
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    Reorder Suggestions
                </button>
            </div>

            {/* Top Action Button Row */}
            <div className={styles.actionsRow}>
                {activeTab === 'fabric' && (
                    <button className={styles.btnAdd} onClick={handleOpenAddFabric}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        + Add Purchase
                    </button>
                )}
                {activeTab === 'ink' && (
                    <button className={styles.btnAdd} onClick={handleOpenAddInk}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        + Add Stock
                    </button>
                )}
                {activeTab === 'packaging' && (
                    <button className={styles.btnAdd} onClick={handleOpenAddPackaging}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        + Add Stock
                    </button>
                )}
            </div>

            {/* Main Register Table */}
            {loading ? (
                <div className={styles.loading}>Loading inventory ledgers...</div>
            ) : data.length === 0 ? (
                <div className={styles.emptyState}>No inventory logs recorded for this category yet.</div>
            ) : (
                <div className={styles.tableCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            {activeTab === 'fabric' && (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Design Name</th>
                                            <th>Vendor</th>
                                            <th>Mtr Ordered</th>
                                            <th>Mtr Received</th>
                                            <th>Mtr Used</th>
                                            <th>Balance</th>
                                            <th>Cost (₹)</th>
                                            <th>Linked Order</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data as FabricRecord[]).map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600 }}>{item.designName}</td>
                                                <td>{item.vendorName}</td>
                                                <td>{item.metresOrdered}m</td>
                                                <td>{item.metresReceived}m</td>
                                                <td>{item.metresUsed}m</td>
                                                <td style={{ fontWeight: 700, color: item.balance > 10 ? 'var(--accent)' : '#ff3b30' }}>{item.balance}m</td>
                                                <td style={{ fontWeight: 600 }}>₹{item.purchaseCost.toLocaleString('en-IN')}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{item.linkedOrderNo || '—'}</td>
                                                <td>{item.purchaseDate}</td>
                                                <td>
                                                    <button className={styles.btnAction} onClick={() => handleOpenEditFabric(item)}>Edit</button>
                                                    <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {activeTab === 'ink' && (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Ink Colour</th>
                                            <th>Total Qty</th>
                                            <th>Supplier</th>
                                            <th>Cost per Unit</th>
                                            <th>Current Balance</th>
                                            <th>Purchase Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data as InkRecord[]).map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600 }}>{item.inkColour}</td>
                                                <td>{item.quantity} {item.unit}</td>
                                                <td>{item.supplier}</td>
                                                <td>₹{item.costPerUnit.toLocaleString('en-IN')}/{item.unit}</td>
                                                <td style={{ fontWeight: 700, color: item.minStock && item.currentBalance <= item.minStock ? '#ff3b30' : (item.currentBalance > 2 ? '#34C759' : '#ff3b30') }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {item.currentBalance} {item.unit}
                                                        {item.minStock && item.currentBalance <= item.minStock && (
                                                            <span style={{ background: item.currentBalance === 0 ? '#FEE2E2' : '#FFF3E0', color: item.currentBalance === 0 ? '#B91C1C' : '#E65100', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                                                {item.currentBalance === 0 ? 'Out of stock' : 'Low stock'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        Min: <input type="number" defaultValue={item.minStock || ''} placeholder="-" onBlur={(e) => handleUpdateMinStock(item.id, 'ink', Number(e.target.value))} style={{ width: '40px', padding: '2px 4px', border: '1px solid var(--border-primary)', borderRadius: '4px', fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                    </div>
                                                </td>
                                                <td>{item.purchaseDate}</td>
                                                <td>
                                                    <button className={`${styles.btnAction} ${styles.btnDeduct}`} onClick={() => handleOpenDeductInk(item)}>Deduct</button>
                                                    <button className={styles.btnAction} onClick={() => handleOpenEditInk(item)}>Edit</button>
                                                    <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {activeTab === 'packaging' && (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Item Name</th>
                                            <th>Type</th>
                                            <th>Total Qty</th>
                                            <th>Supplier</th>
                                            <th>Total Cost</th>
                                            <th>Current Stock</th>
                                            <th>Purchase Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data as PackagingRecord[]).map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                                                <td><span className={styles.btnAction}>{item.type}</span></td>
                                                <td>{item.quantity} units</td>
                                                <td>{item.supplier}</td>
                                                <td>₹{item.cost.toLocaleString('en-IN')}</td>
                                                <td style={{ fontWeight: 700, color: item.minStock && item.currentStock <= item.minStock ? '#ff3b30' : (item.currentStock > 20 ? '#34C759' : '#ff3b30') }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {item.currentStock} units
                                                        {item.minStock && item.currentStock <= item.minStock && (
                                                            <span style={{ background: item.currentStock === 0 ? '#FEE2E2' : '#FFF3E0', color: item.currentStock === 0 ? '#B91C1C' : '#E65100', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                                                {item.currentStock === 0 ? 'Out of stock' : 'Low stock'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        Min: <input type="number" defaultValue={item.minStock || ''} placeholder="-" onBlur={(e) => handleUpdateMinStock(item.id, 'packaging', Number(e.target.value))} style={{ width: '40px', padding: '2px 4px', border: '1px solid var(--border-primary)', borderRadius: '4px', fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                    </div>
                                                </td>
                                                <td>{item.purchaseDate}</td>
                                                <td>
                                                    <button className={styles.btnAction} onClick={() => handleOpenEditPackaging(item)}>Edit</button>
                                                    <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className={styles.mobileCardsList}>
                        {activeTab === 'fabric' && (data as FabricRecord[]).map(item => (
                            <div key={item.id} className={styles.mobileCard}>
                                <div className={styles.mobileCardHeader}>
                                    <span className={styles.mobileCustomerName}>{item.designName}</span>
                                    <span style={{ fontWeight: 700, color: item.balance > 10 ? 'var(--accent)' : '#ff3b30' }}>
                                        {item.balance}m balance
                                    </span>
                                </div>
                                <div className={styles.mobileCardBody}>
                                    <div className={styles.mobileMetaGroup}>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Vendor:</span>
                                            <strong>{item.vendorName}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Mtrs Ordered / Received:</span>
                                            <span>{item.metresOrdered}m / {item.metresReceived}m</span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Mtrs Used:</span>
                                            <span>{item.metresUsed}m</span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Total Purchase Cost:</span>
                                            <strong>₹{item.purchaseCost.toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Linked Order:</span>
                                            <span>{item.linkedOrderNo || '—'}</span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Purchase Date:</span>
                                            <span>{item.purchaseDate}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.mobileCardActions}>
                                    <button className={styles.btnAction} onClick={() => handleOpenEditFabric(item)}>Edit</button>
                                    <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'ink' && (data as InkRecord[]).map(item => (
                            <div key={item.id} className={styles.mobileCard}>
                                <div className={styles.mobileCardHeader}>
                                    <span className={styles.mobileCustomerName}>{item.inkColour}</span>
                                    <span style={{ fontWeight: 700, color: item.currentBalance > 2 ? '#34C759' : '#ff3b30' }}>
                                        {item.currentBalance} {item.unit} balance
                                    </span>
                                </div>
                                <div className={styles.mobileCardBody}>
                                    <div className={styles.mobileMetaGroup}>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Supplier:</span>
                                            <strong>{item.supplier}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Total Qty Ordered:</span>
                                            <span>{item.quantity} {item.unit}</span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Cost per Unit:</span>
                                            <strong>₹{item.costPerUnit.toLocaleString('en-IN')}/{item.unit}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Purchase Date:</span>
                                            <span>{item.purchaseDate}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.mobileCardActions}>
                                    <button className={`${styles.btnAction} ${styles.btnDeduct}`} onClick={() => handleOpenDeductInk(item)}>Deduct</button>
                                    <button className={styles.btnAction} onClick={() => handleOpenEditInk(item)}>Edit</button>
                                    <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'packaging' && (data as PackagingRecord[]).map(item => (
                            <div key={item.id} className={styles.mobileCard}>
                                <div className={styles.mobileCardHeader}>
                                    <span className={styles.mobileCustomerName}>{item.itemName}</span>
                                    <span style={{ fontWeight: 700, color: item.currentStock > 20 ? '#34C759' : '#ff3b30' }}>
                                        {item.currentStock} units stock
                                    </span>
                                </div>
                                <div className={styles.mobileCardBody}>
                                    <div className={styles.mobileMetaGroup}>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Type:</span>
                                            <span className={styles.btnAction} style={{ margin: 0 }}>{item.type}</span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Supplier:</span>
                                            <strong>{item.supplier}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Total Quantity:</span>
                                            <span>{item.quantity} units</span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Total Cost:</span>
                                            <strong>₹{item.cost.toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Purchase Date:</span>
                                            <span>{item.purchaseDate}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.mobileCardActions}>
                                    <button className={styles.btnAction} onClick={() => handleOpenEditPackaging(item)}>Edit</button>
                                    <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'reorder' && <ReorderSuggestions />}

            {/* Fabric Vendor summary cards (Below Table) */}
            {activeTab === 'fabric' && !loading && vendorStats.length > 0 && (
                <>
                    <h3 className={styles.analyticsTitle}>Vendor Procurement Summary</h3>
                    <div className={styles.analyticsGrid}>
                        {vendorStats.map(stat => (
                            <div key={stat.vendorName} className={styles.analyticsCard}>
                                <div className={styles.analyticsCardName}>{stat.vendorName}</div>
                                <div className={styles.analyticsCardStat}>
                                    <span>Total Supplied:</span>
                                    <span className={styles.statValue}>{stat.meters.toLocaleString('en-IN')} meters</span>
                                </div>
                                <div className={styles.analyticsCardStat}>
                                    <span>Total Spent:</span>
                                    <span className={styles.statValue}>₹{stat.cost.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* --- FABRIC PURCHASE MODAL --- */}
            {isFabricModalOpen && (
                <div className={styles.modalBackdrop} onClick={() => setIsFabricModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            {editingItem ? 'Edit Fabric Purchase Log' : 'Log Fabric Purchase'}
                        </div>
                        <form onSubmit={handleSaveFabric}>
                            <div className={styles.formGroup}>
                                <label>Linked Order No. (Optional)</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. ORD-1002"
                                    value={fabricForm.linkedOrderNo}
                                    onChange={(e) => setFabricForm(prev => ({ ...prev, linkedOrderNo: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Vendor</label>
                                <select
                                    className={`${styles.formSelect} ${fabricErrors.vendorId ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                    value={fabricForm.vendorId}
                                    onChange={(e) => {
                                        if (e.target.value === 'ADD_NEW') {
                                            setIsVendorModalOpen(true);
                                        } else {
                                            setFabricForm(prev => ({ ...prev, vendorId: e.target.value }));
                                            setFabricErrors(p => ({...p, vendorId: ''}));
                                        }
                                    }}
                                    data-error={!!fabricErrors.vendorId}
                                >
                                    <option value="">Select Vendor...</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                    <option value="ADD_NEW" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                        + Add new vendor
                                    </option>
                                </select>
                                {fabricErrors.vendorId && <p className="text-red-500 text-xs mt-1">{fabricErrors.vendorId}</p>}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Design Name</label>
                                <input
                                    type="text"
                                    className={`${styles.formInput} ${fabricErrors.designName ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                    placeholder="e.g. Cotton Print Blue"
                                    value={fabricForm.designName}
                                    onChange={(e) => { setFabricForm(prev => ({ ...prev, designName: e.target.value })); setFabricErrors(p => ({...p, designName: ''})); }}
                                    data-error={!!fabricErrors.designName}
                                />
                                {fabricErrors.designName && <p className="text-red-500 text-xs mt-1">{fabricErrors.designName}</p>}
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Metres Ordered</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="0.1"
                                        step="any"
                                        placeholder="Ordered"
                                        value={fabricForm.metresOrdered}
                                        onChange={(e) => setFabricForm(prev => ({ ...prev, metresOrdered: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Metres Received</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="0"
                                        step="any"
                                        placeholder="Received"
                                        value={fabricForm.metresReceived}
                                        onChange={(e) => setFabricForm(prev => ({ ...prev, metresReceived: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Rate per Metre (₹)</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="1"
                                        placeholder="Rate ₹"
                                        value={fabricForm.ratePerMetre}
                                        onChange={(e) => setFabricForm(prev => ({ ...prev, ratePerMetre: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Calculated Cost (₹)</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        disabled
                                        value={
                                            (parseFloat(fabricForm.metresReceived || '0') * parseFloat(fabricForm.ratePerMetre || '0')).toLocaleString('en-IN')
                                        }
                                    />
                                </div>
                            </div>

                            {editingItem && (
                                <div className={styles.formGroup}>
                                    <label>Metres Used (m)</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="0"
                                        step="any"
                                        value={fabricForm.metresUsed}
                                        onChange={(e) => setFabricForm(prev => ({ ...prev, metresUsed: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Purchase Date</label>
                                    <input
                                        type="date"
                                        className={styles.formInput}
                                        required
                                        value={fabricForm.purchaseDate}
                                        onChange={(e) => setFabricForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Invoice No.</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="Invoice No"
                                        value={fabricForm.invoiceNo}
                                        onChange={(e) => setFabricForm(prev => ({ ...prev, invoiceNo: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Notes</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="Special instructions or quality checks"
                                    value={fabricForm.notes}
                                    onChange={(e) => setFabricForm(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsFabricModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnSubmit}>
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- INK MODAL --- */}
            {isInkModalOpen && (
                <div className={styles.modalBackdrop} onClick={() => setIsInkModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            {editingItem ? 'Edit Ink Stock' : 'Add Ink Stock'}
                        </div>
                        <form onSubmit={handleSaveInk}>
                            <div className={styles.formGroup}>
                                <label>Ink Colour Name</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    required
                                    placeholder="e.g. Royal Blue, Crimson"
                                    value={inkForm.inkColour}
                                    onChange={(e) => setInkForm(prev => ({ ...prev, inkColour: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="0.1"
                                        step="any"
                                        placeholder="Qty"
                                        value={inkForm.quantity}
                                        onChange={(e) => setInkForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Unit</label>
                                    <select
                                        className={styles.formSelect}
                                        value={inkForm.unit}
                                        onChange={(e) => setInkForm(prev => ({ ...prev, unit: e.target.value as 'L' | 'kg' }))}
                                    >
                                        <option value="L">Liters (L)</option>
                                        <option value="kg">Kilograms (kg)</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Cost per Unit (₹)</label>
                                <input
                                    type="number"
                                    className={styles.formInput}
                                    required
                                    min="1"
                                    placeholder="e.g. 1200"
                                    value={inkForm.costPerUnit}
                                    onChange={(e) => setInkForm(prev => ({ ...prev, costPerUnit: e.target.value }))}
                                />
                            </div>

                            {editingItem && (
                                <div className={styles.formGroup}>
                                    <label>Current Balance ({inkForm.unit})</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="0"
                                        step="any"
                                        value={inkForm.currentBalance}
                                        onChange={(e) => setInkForm(prev => ({ ...prev, currentBalance: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label>Supplier</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    required
                                    placeholder="Supplier name"
                                    value={inkForm.supplier}
                                    onChange={(e) => setInkForm(prev => ({ ...prev, supplier: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Purchase Date</label>
                                <input
                                    type="date"
                                    className={styles.formInput}
                                    required
                                    value={inkForm.purchaseDate}
                                    onChange={(e) => setInkForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsInkModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnSubmit}>
                                    Save Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PACKAGING MODAL --- */}
            {isPackagingModalOpen && (
                <div className={styles.modalBackdrop} onClick={() => setIsPackagingModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            {editingItem ? 'Edit Packaging Log' : 'Add Packaging Log'}
                        </div>
                        <form onSubmit={handleSavePackaging}>
                            <div className={styles.formGroup}>
                                <label>Item Name</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    required
                                    placeholder="e.g. Cardboard Box, Plastic cover"
                                    value={packagingForm.itemName}
                                    onChange={(e) => setPackagingForm(prev => ({ ...prev, itemName: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Type</label>
                                <select
                                    className={styles.formSelect}
                                    value={packagingForm.type}
                                    onChange={(e) => setPackagingForm(prev => ({ ...prev, type: e.target.value as 'Roll' | 'Cover' | 'Tag' }))}
                                >
                                    <option value="Roll">Roll</option>
                                    <option value="Cover">Cover</option>
                                    <option value="Tag">Tag</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Total Quantity (units)</label>
                                <input
                                    type="number"
                                    className={styles.formInput}
                                    required
                                    min="1"
                                    placeholder="e.g. 500"
                                    value={packagingForm.quantity}
                                    onChange={(e) => setPackagingForm(prev => ({ ...prev, quantity: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Total Cost (₹)</label>
                                <input
                                    type="number"
                                    className={styles.formInput}
                                    required
                                    min="1"
                                    placeholder="Total procurement cost"
                                    value={packagingForm.cost}
                                    onChange={(e) => setPackagingForm(prev => ({ ...prev, cost: e.target.value }))}
                                />
                            </div>

                            {editingItem && (
                                <div className={styles.formGroup}>
                                    <label>Current Stock (units)</label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        required
                                        min="0"
                                        value={packagingForm.currentStock}
                                        onChange={(e) => setPackagingForm(prev => ({ ...prev, currentStock: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label>Supplier</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    required
                                    placeholder="Supplier name"
                                    value={packagingForm.supplier}
                                    onChange={(e) => setPackagingForm(prev => ({ ...prev, supplier: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Purchase Date</label>
                                <input
                                    type="date"
                                    className={styles.formInput}
                                    required
                                    value={packagingForm.purchaseDate}
                                    onChange={(e) => setPackagingForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsPackagingModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnSubmit}>
                                    Save Packaging
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MANUAL DEDUCT INK MODAL --- */}
            {isDeductInkModalOpen && selectedInkForDeduct && (
                <div className={styles.modalBackdrop} onClick={() => setIsDeductInkModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>Deduct Ink Usage ({selectedInkForDeduct.inkColour})</div>
                        <form onSubmit={handleSaveDeductInk}>
                            <div className={styles.formGroup} style={{ background: 'var(--bg-card-hover)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Available Balance:</span>
                                <span style={{ fontSize: '16px', fontWeight: 700, marginLeft: '8px' }}>
                                    {selectedInkForDeduct.currentBalance} {selectedInkForDeduct.unit}
                                </span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Deduct Quantity ({selectedInkForDeduct.unit})</label>
                                <input
                                    type="number"
                                    className={styles.formInput}
                                    required
                                    min="0.01"
                                    step="any"
                                    placeholder="Quantity to subtract"
                                    value={deductForm.deductAmount}
                                    onChange={(e) => setDeductForm(prev => ({ ...prev, deductAmount: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Reason / Production Batch</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Batch #109 print run"
                                    value={deductForm.reason}
                                    onChange={(e) => setDeductForm(prev => ({ ...prev, reason: e.target.value }))}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsDeductInkModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnSubmit}>
                                    Confirm Deduction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- ADD VENDOR SUB-MODAL --- */}
            {isVendorModalOpen && (
                <div className={styles.modalBackdrop} style={{ zIndex: 1100 }} onClick={() => setIsVendorModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>Add New Vendor Master</div>
                        <form onSubmit={handleSaveVendor}>
                            <div className={styles.formGroup}>
                                <label>Vendor Name</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    required
                                    placeholder="e.g. Paramount Fabrics"
                                    value={vendorForm.name}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Phone / Contact</label>
                                <input
                                    type="tel"
                                    className={styles.formInput}
                                    required
                                    placeholder="e.g. +919876543210"
                                    value={vendorForm.contact}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, contact: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>City</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Surat, Mumbai"
                                    value={vendorForm.city}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, city: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>GST No.</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. 24AAAAA1111A1Z1"
                                    value={vendorForm.gstNo}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, gstNo: e.target.value }))}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsVendorModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnSubmit}>
                                    Save Vendor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
