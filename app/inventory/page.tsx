'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './Inventory.module.css';
import { Package, Search, Plus, Archive, History, AlertTriangle, Trash2 } from 'lucide-react';
import AddPurchaseModal from '@/components/inventory/AddPurchaseModal';
import InventoryHistoryModal from '@/components/inventory/InventoryHistoryModal';
import ReorderSuggestions from './ReorderSuggestions';
import StatWidget from '@/components/ui/StatWidget';

interface Vendor {
    id: number;
    name: string;
}

interface MaterialRecord {
    id: number;
    name: string;
    category: string;
    vendor_id: number;
    vendor_name: string;
    color: string | null;
    gsm: string | null;
    unit: string;
    available_stock: number;
    reserved_stock: number;
    used_stock: number;
    rate_per_unit: number;
    min_stock: number;
    last_purchase_date: string;
    status: string;
}

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'Fabric'>('Fabric');
    const [data, setData] = useState<MaterialRecord[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [widgets, setWidgets] = useState<any>({});
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modals
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialRecord | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistoryMaterial, setSelectedHistoryMaterial] = useState<{ id: number, name: string, unit: string } | null>(null);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/inventory?category=${activeTab}`, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData(json.data || []);
                setVendors(json.vendors || []);
                setWidgets(json.widgets || {});
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
        (window as any).refreshInventory = fetchInventory;
        return () => {
            delete (window as any).refreshInventory;
        };
    }, [activeTab]);

    const handleAddStock = (material: MaterialRecord) => {
        setEditingMaterial(material);
        setIsPurchaseModalOpen(true);
    };

    const handleViewHistory = (material: MaterialRecord) => {
        setSelectedHistoryMaterial({ id: material.id, name: material.name, unit: material.unit });
        setHistoryModalOpen(true);
    };

    const handleNewPurchase = () => {
        setEditingMaterial(null);
        setIsPurchaseModalOpen(true);
    };

    const handleDeleteMaterial = async (id: number) => {
        if (!confirm('Are you sure you want to delete this material? This will delete all its history as well.')) return;
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_material', id })
            });
            if (res.ok) {
                fetchInventory();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete material');
            }
        } catch (e) {
            console.error('Delete error', e);
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                                  (item.color && item.color.toLowerCase().includes(search.toLowerCase())) ||
                                  (item.gsm && item.gsm.toLowerCase().includes(search.toLowerCase()));
            const matchesVendor = vendorFilter ? item.vendor_id.toString() === vendorFilter : true;
            
            let matchesStatus = true;
            if (statusFilter === 'Low Stock') {
                matchesStatus = Number(item.available_stock) <= Number(item.min_stock) && Number(item.min_stock) > 0;
            } else if (statusFilter === 'Out of Stock') {
                matchesStatus = Number(item.available_stock) <= 0;
            } else if (statusFilter === 'In Stock') {
                matchesStatus = Number(item.available_stock) > Number(item.min_stock) || Number(item.min_stock) === 0;
            }
            
            return matchesSearch && matchesVendor && matchesStatus;
        });
    }, [data, search, vendorFilter, statusFilter]);

    if (loading && data.length === 0) {
        return <div className={styles.page}>Loading Inventory System...</div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Inventory Management</h1>
                    <p className={styles.subtitle}>Material-centric stock ledger, reservations, and procurement</p>
                </div>
                <div className={styles.actionsRow}>
                    <button className={styles.btnPrimary} onClick={handleNewPurchase}>
                        <Plus size={18} /> Add New Material
                    </button>
                </div>
            </div>

            {/* Top Widgets */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <StatWidget 
                    label="Total Inventory Value" 
                    value={formatCurrency(widgets.totalValue || 0)} 
                    accentColor="#AF52DE" 
                    accentBg="rgba(175, 82, 222, 0.12)" 
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
                />
                <StatWidget 
                    label="Total Available Fabric" 
                    value={`${widgets.totalAvailableFabric?.toLocaleString('en-IN') || 0}m`} 
                    accentColor="#34C759" 
                    accentBg="rgba(52,199,89,0.08)" 
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>}
                />
                <StatWidget 
                    label="Reserved for Orders" 
                    value={`${widgets.reservedFabric?.toLocaleString('en-IN') || 0}m`} 
                    accentColor="#3B82F6" 
                    accentBg="rgba(59,130,246,0.12)" 
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>}
                />
                <StatWidget 
                    label="Low Stock Materials" 
                    value={`${widgets.lowStockCount || 0} items`} 
                    accentColor="#FF3B30" 
                    accentBg="rgba(255,59,48,0.08)" 
                    pulse={widgets.lowStockCount > 0}
                    badge={widgets.lowStockCount > 0 ? "Action needed" : ""}
                    badgeType="urgent"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
                />
                <StatWidget 
                    label="Monthly Procurement" 
                    value={formatCurrency(widgets.monthlyProcurement || 0)} 
                    accentColor="#FFCC00" 
                    accentBg="rgba(255,204,0,0.08)" 
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                />
                <StatWidget 
                    label="Pending Vendor Pymts" 
                    value={formatCurrency(widgets.pendingVendorPayments || 0)} 
                    accentColor="#FF3B30" 
                    accentBg="rgba(255,59,48,0.08)" 
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
                />
            </div>

            {/* Category Tabs Removed - Only Fabric tracked physically now */}

            {/* Filters */}
            <div className={styles.filtersRow}>
                <div className={styles.filterGroup}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-secondary)' }} />
                        <input 
                            type="text" 
                            placeholder="Search materials..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={styles.searchInput}
                            style={{ paddingLeft: 36 }}
                        />
                    </div>
                    <select 
                        value={vendorFilter} 
                        onChange={(e) => setVendorFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">All Vendors</option>
                        {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="All">All Statuses</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </select>
                </div>
            </div>

            {/* Material Cards Grid */}
            <div className={styles.cardsGrid}>
                {filteredData.map(item => {
                    const isLowStock = Number(item.available_stock) <= Number(item.min_stock) && Number(item.min_stock) > 0;
                    const isOutOfStock = Number(item.available_stock) <= 0;
                    const availableSafe = Math.max(0, Number(item.available_stock));
                    const totalInvValue = (availableSafe + Math.max(0, Number(item.reserved_stock))) * Math.max(0, Number(item.rate_per_unit));

                    return (
                        <div key={item.id} className={styles.materialCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitleGroup}>
                                    <span className={styles.cardTitle}>{item.name}</span>
                                    <span className={styles.cardSubtitle}>
                                        <Package size={14} /> {item.category} • {item.vendor_name}
                                    </span>
                                    {(item.color || item.gsm) && (
                                        <span className={styles.cardSubtitle} style={{ marginTop: 4 }}>
                                            {item.color} {item.color && item.gsm ? '•' : ''} {item.gsm}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.badge} style={{
                                    background: isOutOfStock ? '#FEF2F2' : isLowStock ? '#FFFBEB' : '#ECFDF5',
                                    color: isOutOfStock ? '#B91C1C' : isLowStock ? '#D97706' : '#059669'
                                }}>
                                    {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                                </div>
                            </div>

                            <div className={styles.metersContainer}>
                                <div className={styles.meterRow}>
                                    <span className={`${styles.meterLabel} ${styles.meterAvailable}`}>Available</span>
                                    <span className={styles.meterValue} style={{ color: isOutOfStock ? '#B91C1C' : 'var(--text-primary)' }}>
                                        {isOutOfStock ? 'OUT OF STOCK' : `${availableSafe}${item.unit}`}
                                    </span>
                                </div>
                                <div className={styles.meterRow}>
                                    <span className={`${styles.meterLabel} ${styles.meterReserved}`}>Reserved</span>
                                    <span className={styles.meterValue}>{item.reserved_stock}{item.unit}</span>
                                </div>
                                <div className={styles.meterRow}>
                                    <span className={`${styles.meterLabel} ${styles.meterUsed}`}>Used / Delivered</span>
                                    <span className={styles.meterValue}>{item.used_stock}{item.unit}</span>
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <div className={styles.footerMeta}>
                                    <span className={styles.footerLabel}>Total Value</span>
                                    <span className={styles.footerValue}>₹{totalInvValue.toLocaleString('en-IN')}</span>
                                </div>
                                <div className={styles.cardActions}>
                                    <button className={styles.btnSecondary} onClick={() => handleDeleteMaterial(item.id)} style={{ color: '#ef4444' }} title="Delete Material">
                                        <Trash2 size={16} />
                                    </button>
                                    <button className={styles.btnSecondary} onClick={() => handleViewHistory(item)} title="View History">
                                        <History size={16} />
                                    </button>
                                    <button className={styles.btnPrimary} onClick={() => handleAddStock(item)} style={{ padding: '8px 12px', fontSize: '13px' }}>
                                        <Plus size={16} /> Add Stock
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredData.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                        <Package size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                        <h3>No materials found</h3>
                        <p>Try adjusting your filters or add a new material.</p>
                    </div>
                )}
            </div>

            <ReorderSuggestions />

            <AddPurchaseModal 
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onSave={() => {
                    setIsPurchaseModalOpen(false);
                    fetchInventory();
                }}
                vendors={vendors}
                editingMaterial={editingMaterial}
            />

            <InventoryHistoryModal 
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                materialId={selectedHistoryMaterial?.id || 0}
                materialName={selectedHistoryMaterial?.name || ''}
                unit={selectedHistoryMaterial?.unit || 'm'}
            />
        </div>
    );
}
