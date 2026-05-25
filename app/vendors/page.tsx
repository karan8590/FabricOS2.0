'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import AddVendorModal from '@/components/vendors/AddVendorModal';
import StatWidget from '@/components/ui/StatWidget';
import styles from './Vendors.module.css';
import { GST_STATES, validateGSTIN } from '@/lib/gst';
import { formatCurrencySafe } from '@/lib/utils';

interface Vendor {
    id: number;
    name: string;
    contact: string;
    material_supplied: string;
    balance: number;
    created_at: number;
    vendor_type?: string;
    gst_no?: string;
    state?: string;
    state_code?: string;
    vehicle_number?: string;
    driver_name?: string;
    vehicle_type?: string;
    default_route?: string;
    alt_phone?: string;
}

export default function VendorsPage() {
    const { user } = useAuth();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [availableFilters, setAvailableFilters] = useState<FilterDefinition[]>([
        { id: 'balance', label: 'Balance', type: 'number', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
        )},
    ]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddVendorWizard, setShowAddVendorWizard] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [modalError, setModalError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        materialSupplied: '',
        balance: 0,
        vendorType: 'fabric_supplier',
        gstNo: '',
        state: '',
        stateCode: '',
        vehicleNumber: '',
        driverName: '',
        vehicleType: '',
        defaultRoute: '',
        altPhone: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchVendors();
    }, []);

    const stats = useMemo(() => {
        const total = vendors.length;
        const active = vendors.filter(v => v.balance > 0).length;
        const embroidery = vendors.filter(v => v.vendor_type?.toLowerCase() === 'embroidery').length;
        const dyeing = vendors.filter(v => v.vendor_type?.toLowerCase() === 'dyeing').length;
        return { total, active, embroidery, dyeing };
    }, [vendors]);

    const formatCurrency = formatCurrencySafe;

    const fetchVendors = async (filters: FilterRow[] = [], search: string = searchTerm) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);

            filters.forEach(f => {
                if (f.fieldId === 'material') {
                    params.append('materialSupplied', f.value);
                } else if (f.fieldId === 'balance') {
                    if (f.operator === 'is') {
                        params.set('minBalance', f.value);
                        params.set('maxBalance', f.value);
                    } else if (f.operator === 'greater than') {
                        params.set('minBalance', f.value);
                    } else if (f.operator === 'less than') {
                        params.set('maxBalance', f.value);
                    } else if (f.operator === 'between') {
                        if (f.value?.start) params.set('minBalance', f.value.start);
                        if (f.value?.end) params.set('maxBalance', f.value.end);
                    }
                }
            });

            const res = await fetch(`/api/vendors?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setVendors(data.vendors);
                
                // Extract unique materials for filter if not already set
                if (availableFilters.length <= 1) {
                    const materials = Array.from(new Set(data.vendors.map((v: Vendor) => v.material_supplied)))
                        .filter(Boolean)
                        .map(m => ({ value: m as string, label: m as string }));
                    
                    setAvailableFilters([
                        { id: 'material', label: 'Material', type: 'select', options: materials },
                        { id: 'balance', label: 'Balance', type: 'number' },
                    ]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = (filters: FilterRow[]) => {
        setActiveFilters(filters);
        fetchVendors(filters);
    };

    const handleRemoveFilter = (id: string) => {
        const newFilters = activeFilters.filter(f => f.id !== id);
        setActiveFilters(newFilters);
        fetchVendors(newFilters);
    };

    const handleAddVendor = () => {
        setShowAddVendorWizard(true);
    };

    const handleEditVendor = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setModalError('');
        setFormErrors({});
        setFormData({
            name: vendor.name,
            contact: vendor.contact,
            materialSupplied: vendor.material_supplied || '',
            balance: vendor.balance || 0,
            vendorType: vendor.vendor_type || 'fabric_supplier',
            gstNo: vendor.gst_no || '',
            state: vendor.state || '',
            stateCode: vendor.state_code || '',
            vehicleNumber: vendor.vehicle_number || '',
            driverName: vendor.driver_name || '',
            vehicleType: vendor.vehicle_type || '',
            defaultRoute: vendor.default_route || '',
            altPhone: vendor.alt_phone || '',
        });
        setShowEditModal(true);
    };

    const handleStateChange = (stateName: string) => {
        const code = GST_STATES.find(s => s.name === stateName)?.code || '';
        setFormData(prev => {
            const updatedGst = prev.gstNo && prev.gstNo.length >= 2 && code 
                ? code + prev.gstNo.substring(2) 
                : prev.gstNo;
            return {
                ...prev,
                state: stateName,
                stateCode: code,
                gstNo: updatedGst
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError('');

        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Vendor name is required';
        if (!formData.contact?.trim()) newErrors.contact = 'Contact is required';
        if (formData.vendorType !== 'transport' && !formData.materialSupplied?.trim()) {
            newErrors.materialSupplied = 'Material supplied is required';
        }
        
        const materialToSubmit = formData.vendorType === 'transport' ? 'Transport Services' : formData.materialSupplied;

        if (formData.gstNo) {
            const val = validateGSTIN(formData.gstNo, formData.stateCode);
            if (!val.valid) newErrors.gstNo = val.error || 'Invalid GSTIN';
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                contact: formData.contact,
                materialSupplied: materialToSubmit,
                balance: formData.balance,
                vendorType: formData.vendorType,
                gstNo: formData.gstNo ? formData.gstNo.trim().toUpperCase() : null,
                state: formData.state || null,
                stateCode: formData.stateCode || null,
                vehicleNumber: formData.vehicleNumber || null,
                driverName: formData.driverName || null,
                vehicleType: formData.vehicleType || null,
                defaultRoute: formData.defaultRoute || null,
                altPhone: formData.altPhone || null,
            };

            const res = await fetch(`/api/vendors?id=${editingVendor?.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowEditModal(false);
                setFormErrors({});
                fetchVendors(activeFilters);
            } else {
                const data = await res.json();
                setModalError(data.error || 'Failed to update vendor');
            }
        } catch (error) {
            console.error('Save vendor error:', error);
            setModalError('Something went wrong. Please try again.');
        }
    };

    const confirmDelete = (vendorId: number) => {
        setVendorToDelete(vendorId);
        setOpenMenuId(null);
    };

    const executeDelete = async () => {
        if (!vendorToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/vendors/${vendorToDelete}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            
            if (res.ok) {
                fetchVendors(activeFilters);
                setVendorToDelete(null);
            } else {
                alert(data.error || 'Failed to delete vendor');
                setVendorToDelete(null);
            }
        } catch (error) {
            console.error('Delete vendor error:', error);
            alert('Something went wrong while trying to delete.');
            setVendorToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading vendors...</div>;
    }

    return (
        <div className={styles.vendorsPage}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Vendors</h1>
                    <p className={styles.subtitle}>Manage vendor relationships and materials</p>
                </div>
                <Button variant="primary" onClick={handleAddVendor}>
                    Add Vendor
                </Button>
            </div>

            <div className={styles.statsRow} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <StatWidget
                    label="Total Vendors"
                    value={stats.total}
                    secondaryText="Registered"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
                    accentColor="#0071E3"
                    accentBg="rgba(0,113,227,0.04)"
                />
                <StatWidget
                    label="Active Payables"
                    value={stats.active}
                    secondaryText="Vendors with balance"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
                    accentColor="#FF9500"
                    accentBg="rgba(255,149,0,0.04)"
                    badge={`${Math.round((stats.active / (stats.total || 1)) * 100)}%`}
                    badgeType="urgent"
                />
                <StatWidget
                    label="Embroidery"
                    value={stats.embroidery}
                    secondaryText="Job Workers"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>}
                    accentColor="#AF52DE"
                    accentBg="rgba(175,82,222,0.04)"
                />
                <StatWidget
                    label="Dyeing"
                    value={stats.dyeing}
                    secondaryText="Job Workers"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                    accentColor="#34C759"
                    accentBg="rgba(52,199,89,0.04)"
                />
            </div>

            <div className={styles.filterControls}>
                <div className={styles.searchWrapper}>
                    <Input
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            fetchVendors(activeFilters, e.target.value);
                        }}
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        }
                    />
                </div>
                <AdvancedFilter 
                    availableFilters={availableFilters}
                    onApply={handleApplyFilters}
                    activeFilters={activeFilters}
                />
            </div>

            {activeFilters.length > 0 && (
                <div className={styles.activeFilters}>
                    {activeFilters.map(filter => {
                        const field = availableFilters.find(f => f.id === filter.fieldId);
                        let valueLabel = '';
                        
                        if (filter.operator === 'between' || field?.type === 'dateRange') {
                            valueLabel = `${filter.value?.start || '?'} – ${filter.value?.end || '?'}`;
                        } else if (field?.type === 'select') {
                            valueLabel = field.options?.find(o => o.value === filter.value)?.label || filter.value;
                        } else {
                            valueLabel = filter.value;
                        }
                        
                        const operatorLabel = filter.operator === 'is' ? '' : ` ${filter.operator}`;
                        
                        return (
                            <div key={filter.id} className={styles.filterChip}>
                                <span className={styles.chipLabel}>{field?.label}{operatorLabel}:</span> {valueLabel}
                                <button
                                    onClick={() => handleRemoveFilter(filter.id)}
                                    className={styles.clearFilterBtn}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                    <button className={styles.clearAllBtn} onClick={() => handleApplyFilters([])}>
                        Clear All
                    </button>
                </div>
            )}

            {vendors.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🏭</div>
                    <h3 className={styles.emptyTitle}>No Vendors Found</h3>
                    <p className={styles.emptyText}>
                        {searchTerm ? 'Try adjusting your search' : 'Add your first vendor to get started'}
                    </p>
                </div>
            ) : (
                <div className={styles.vendorsGrid}>
                    {vendors.map((vendor) => (
                        <Card key={vendor.id} className={styles.vendorCard}>
                            <div className={styles.vendorHeader}>
                                <div>
                                    <h3 className={styles.vendorName}>{vendor.name}</h3>
                                    {vendor.vendor_type && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md mt-1 inline-block">
                                            {vendor.vendor_type === 'fabric_supplier' ? 'Fabric Supplier' : vendor.vendor_type === 'transport' ? 'Transport / Tempo' : vendor.vendor_type}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.vendorActions} style={{ position: 'relative' }}>
                                    <button
                                        className={styles.actionButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === vendor.id ? null : vendor.id);
                                        }}
                                        style={{ padding: '6px', borderRadius: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1" />
                                            <circle cx="12" cy="5" r="1" />
                                            <circle cx="12" cy="19" r="1" />
                                        </svg>
                                    </button>
                                    
                                    {openMenuId === vendor.id && (
                                        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '4px', minWidth: '150px' }}>
                                            {/* Temporarily using Edit as View Details placeholder since full View Details page is not yet requested */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleEditVendor(vendor); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', color: '#334155' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                View Details
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleEditVendor(vendor); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', color: '#334155' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                Edit Vendor
                                            </button>
                                            {user?.role === 'admin' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); confirmDelete(vendor.id); }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', color: '#ef4444' }}
                                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Delete Vendor
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.vendorInfo}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Contact:</span>
                                    <span className={styles.infoValue}>{vendor.contact}</span>
                                </div>
                                {vendor.vendor_type !== 'transport' ? (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Material:</span>
                                        <span className={styles.infoValue}>{vendor.material_supplied}</span>
                                    </div>
                                ) : (
                                    <>
                                        {vendor.vehicle_number && (
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>Vehicle:</span>
                                                <span className={styles.infoValue}>{vendor.vehicle_number}</span>
                                            </div>
                                        )}
                                        {vendor.driver_name && (
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>Driver:</span>
                                                <span className={styles.infoValue}>{vendor.driver_name}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {vendor.gst_no && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>GSTIN:</span>
                                        <span className="text-xs font-mono text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{vendor.gst_no}</span>
                                    </div>
                                )}
                                {vendor.state && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>State:</span>
                                        <span className="text-xs text-slate-600 font-medium">{vendor.state} ({vendor.state_code})</span>
                                    </div>
                                )}
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Balance:</span>
                                    <span className={`${styles.infoValue} ${styles.balance}`}>
                                        {formatCurrency(vendor.balance)}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <AddVendorModal 
                isOpen={showAddVendorWizard}
                onClose={() => setShowAddVendorWizard(false)}
                onSuccess={() => {
                    setShowAddVendorWizard(false);
                    fetchVendors(activeFilters);
                }}
            />

            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Vendor Details"
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                        {modalError && (
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-800 text-xs font-semibold flex items-center gap-2">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Vendor Name"
                                value={formData.name}
                                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors(p => ({...p, name: ''})); }}
                                error={formErrors.name}
                                data-error={!!formErrors.name}
                            />
                            <Input
                                label="Contact (Phone/Email)"
                                value={formData.contact}
                                onChange={(e) => { setFormData({ ...formData, contact: e.target.value }); setFormErrors(p => ({...p, contact: ''})); }}
                                error={formErrors.contact}
                                data-error={!!formErrors.contact}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Vendor Type</label>
                                <select 
                                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                    value={formData.vendorType}
                                    onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                                >
                                    <option value="fabric_supplier">Fabric Supplier</option>
                                    <option value="embroidery">Embroidery Vendor</option>
                                    <option value="dyeing">Dyeing Vendor</option>
                                    <option value="both">Both (Embroidery & Dyeing)</option>
                                    <option value="transport">Transport / Tempo</option>
                                </select>
                            </div>

                            {formData.vendorType !== 'transport' && (
                                <Input
                                    label="Material Supplied"
                                    value={formData.materialSupplied}
                                    onChange={(e) => { setFormData({ ...formData, materialSupplied: e.target.value }); setFormErrors(p => ({...p, materialSupplied: ''})); }}
                                    error={formErrors.materialSupplied}
                                    data-error={!!formErrors.materialSupplied}
                                />
                            )}
                        </div>

                        {formData.vendorType === 'transport' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Driver Name"
                                        value={formData.driverName}
                                        onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                                    />
                                    <Input
                                        label="Alternate Number"
                                        value={formData.altPhone}
                                        onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Vehicle Number"
                                        value={formData.vehicleNumber}
                                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        placeholder="MH 04 AB 1234"
                                    />
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Vehicle Type</label>
                                        <select 
                                            className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                            value={formData.vehicleType}
                                            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="mini_truck">Mini Truck</option>
                                            <option value="tempo">Tempo</option>
                                            <option value="heavy">Heavy Truck</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Route / Area"
                                        value={formData.defaultRoute}
                                        onChange={(e) => setFormData({ ...formData, defaultRoute: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Billing State</label>
                                <select
                                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                    value={formData.state}
                                    onChange={(e) => handleStateChange(e.target.value)}
                                >
                                    <option value="">Select State</option>
                                    {GST_STATES.map(s => (
                                        <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="GSTIN (Optional)"
                                placeholder={`${formData.stateCode || '24'}XXXXX1234X1ZX`}
                                value={formData.gstNo}
                                onChange={(e) => { setFormData({ ...formData, gstNo: e.target.value.toUpperCase() }); setFormErrors(p => ({...p, gstNo: ''})); }}
                                maxLength={15}
                                style={{ fontFamily: 'monospace' }}
                                error={formErrors.gstNo}
                                data-error={!!formErrors.gstNo}
                            />
                        </div>

                        <Input
                            label="Outstanding Balance (₹)"
                            type="number"
                            value={formData.balance.toString()}
                            onChange={(e) =>
                                setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
                            }
                        />
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--spacing-3)',
                            marginTop: 'var(--spacing-6)',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Update Vendor
                        </Button>
                    </div>
                </form>
            </Modal>
            <ConfirmDialog
                isOpen={!!vendorToDelete}
                onClose={() => setVendorToDelete(null)}
                onConfirm={executeDelete}
                title="Delete Vendor"
                message="Are you sure you want to delete this vendor? This action cannot be undone and will only succeed if the vendor has no outstanding balance, bills, or history."
                confirmText={isDeleting ? "Deleting..." : "Delete Vendor"}
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
