'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronDown, Calendar, AlertCircle, CheckCircle2, Plus, ShoppingBag, User, Settings2, Package } from 'lucide-react';
import styles from './CreateOrderPanel.module.css';
import DesignPickerModal from './DesignPickerModal';
import { celebrateSmall, celebrateMilestone } from '@/lib/confetti';

interface Customer {
    id: number;
    name: string;
    phone: string;
}

interface Design {
    id: number;
    name: string;
    price_per_meter: number;
    image_url?: string;
    category?: string;
    code?: string;
}

interface CreateOrderPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderData?: any, sendSample?: boolean) => void;
    initialCustomerId?: number;
}

export default function CreateOrderPanel({ isOpen, onClose, onSuccess, initialCustomerId }: CreateOrderPanelProps) {
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);
    const [mounted, setMounted] = useState(false);

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [pricePerUnit, setPricePerUnit] = useState<string>('');
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [priority, setPriority] = useState<'Normal' | 'Urgent' | 'VIP'>('Normal');
    const [notes, setNotes] = useState<string>('');
    const [sendSampleFirst, setSendSampleFirst] = useState(false);

    // Dropdown States
    const [customerSearch, setCustomerSearch] = useState('');
    const [designSearch, setDesignSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isDesignDropdownOpen, setIsDesignDropdownOpen] = useState(false);

    const customerDropdownRef = useRef<HTMLDivElement>(null);

    const [isDesignPickerOpen, setIsDesignPickerOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            document.body.style.overflow = 'hidden';
            
            // Handle Escape key
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                window.removeEventListener('keydown', handleEsc);
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen, onClose]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setIsCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDesignSelect = (design: any) => {
        setSelectedDesign(design);
        setPricePerUnit(design.price_per_meter.toString());
        setIsDesignPickerOpen(false);
    };

    const fetchInitialData = async () => {
        try {
            const [custRes, designRes] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/designs')
            ]);
            
            if (custRes.ok) {
                const data = await custRes.json();
                setCustomers(data.customers);
                
                // Pre-select customer if initialCustomerId is provided
                if (initialCustomerId) {
                    const found = data.customers.find((c: Customer) => c.id === initialCustomerId);
                    if (found) setSelectedCustomer(found);
                }
            }
            
            if (designRes.ok) {
                const data = await designRes.json();
                setDesigns(data.designs);
            }
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        }
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => 
            (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || 
            (c.phone || '').includes(customerSearch)
        );
    }, [customers, customerSearch]);

    const filteredDesigns = useMemo(() => {
        return designs.filter(d => 
            (d.name || '').toLowerCase().includes(designSearch.toLowerCase())
        );
    }, [designs, designSearch]);


    const totalCalculation = useMemo(() => {
        const q = parseFloat(quantity) || 0;
        const p = parseFloat(pricePerUnit) || 0;
        return (q * p).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    }, [quantity, pricePerUnit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedDesign || !quantity) return;

        setLoading(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    designId: selectedDesign.id,
                    quantityMeters: parseFloat(quantity),
                    pricePerUnit: parseFloat(pricePerUnit),
                    deliveryDate: deliveryDate ? new Date(deliveryDate).getTime() / 1000 : null,
                    orderDate: orderDate ? new Date(orderDate).getTime() / 1000 : null,
                    priority,
                    notes
                }),
            });

            if (res.ok) {
                const data = await res.json();
                
                if (data.totalOrders && data.totalOrders > 0 && data.totalOrders % 100 === 0) {
                    celebrateMilestone(`confetti_milestone_${data.totalOrders}`);
                    setTimeout(() => alert(`🎉 Amazing! That was order #${data.totalOrders}!`), 100);
                } else if (data.totalCustomerOrders === 1) {
                    celebrateSmall(`confetti_newcust_${data.orderId}`);
                }
                
                onSuccess({
                    id: data.orderId,
                    order_number: data.orderNumber,
                    customer_name: selectedCustomer.name,
                    design_name: selectedDesign.name,
                    quantity_meters: quantity,
                    total_price: parseFloat(quantity) * parseFloat(pricePerUnit)
                }, sendSampleFirst);
                onClose();
                resetForm();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create order');
            }
        } catch (error) {
            console.error('Create order error:', error);
            alert('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedCustomer(null);
        setSelectedDesign(null);
        setQuantity('');
        setPricePerUnit('');
        setDeliveryDate('');
        setOrderDate(new Date().toISOString().split('T')[0]);
        setPriority('Normal');
        setNotes('');
        setSendSampleFirst(false);
        setCustomerSearch('');
        setDesignSearch('');
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '8px', borderRadius: '10px' }}>
                            <ShoppingBag size={20} />
                        </div>
                        <h2 className={styles.title}>Create New Order</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* SECTION 1: Customer Details */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <User size={14} />
                            <span className={styles.sectionTitle}>Section 1: Customer Details</span>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field} ref={customerDropdownRef}>
                                <label className={styles.label}>Select Customer</label>
                                <div className={styles.selectWrapper}>
                                    <div 
                                        className={styles.selectTrigger} 
                                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                                    >
                                        <span>{selectedCustomer ? selectedCustomer.name : 'Choose a customer...'}</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    {isCustomerDropdownOpen && (
                                        <div className={styles.selectDropdown}>
                                            <input 
                                                className={styles.searchInput}
                                                placeholder="Search customer..."
                                                value={customerSearch}
                                                onChange={e => setCustomerSearch(e.target.value)}
                                                autoFocus
                                            />
                                            {filteredCustomers.map(c => (
                                                <div 
                                                    key={c.id} 
                                                    className={`${styles.option} ${selectedCustomer?.id === c.id ? styles.selectedOption : ''}`}
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setIsCustomerDropdownOpen(false);
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Contact Phone</label>
                                <input 
                                    className={styles.selectTrigger}
                                    value={selectedCustomer?.phone || ''}
                                    placeholder="Autofilled from customer"
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Design Details */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Settings2 size={14} />
                            <span className={styles.sectionTitle}>Section 2: Design Details</span>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Fabric / Design Catalog</label>
                                <div className={styles.selectWrapper}>
                                    <div 
                                        className={styles.selectTrigger} 
                                        onClick={() => setIsDesignPickerOpen(true)}
                                        style={{ height: '52px', borderStyle: 'dashed', borderColor: selectedDesign ? '#2563eb' : '#333' }}
                                    >
                                        {selectedDesign ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {selectedDesign.image_url ? (
                                                    <img src={selectedDesign.image_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                                                ) : <div style={{ background: '#222', padding: '6px', borderRadius: '6px' }}><Package size={16} /></div>}
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedDesign.name}</div>
                                                    <div style={{ fontSize: '11px', opacity: 0.5 }}>{selectedDesign.category} • {selectedDesign.code}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#666' }}>Choose fabric or design from catalog...</span>
                                        )}
                                        <div className={styles.pickerBtn}>Browse Catalog</div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Quantity (Meters)</label>
                                <input 
                                    type="number"
                                    className={styles.selectTrigger}
                                    placeholder="0.00"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    step="0.01"
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Price per Meter (₹)</label>
                                <input 
                                    type="number"
                                    className={styles.selectTrigger}
                                    placeholder="0.00"
                                    value={pricePerUnit}
                                    onChange={e => setPricePerUnit(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.totalBar}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className={styles.totalLabel}>Auto-calculated Order Value</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>Quantity × Price per meter</span>
                            </div>
                            <span className={styles.totalValue}>₹{totalCalculation}</span>
                        </div>
                    </div>

                    {/* SECTION 3: Production & Logistics */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Calendar size={14} />
                            <span className={styles.sectionTitle}>Section 3: Production & Logistics</span>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label className={styles.label}>Order Date</label>
                                <div className={styles.selectWrapper}>
                                    <input 
                                        type="date"
                                        className={styles.selectTrigger}
                                        value={orderDate}
                                        onChange={e => setOrderDate(e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    <Calendar size={16} style={{ position: 'absolute', right: '12px', top: '13px', pointerEvents: 'none', opacity: 0.5 }} />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Target Delivery Date</label>
                                <div className={styles.selectWrapper}>
                                    <input 
                                        type="date"
                                        className={styles.selectTrigger}
                                        value={deliveryDate}
                                        onChange={e => setDeliveryDate(e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    <Calendar size={16} style={{ position: 'absolute', right: '12px', top: '13px', pointerEvents: 'none', opacity: 0.5 }} />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Manufacturing Priority</label>
                                <div className={styles.priorityGroup}>
                                    {(['Normal', 'Urgent', 'VIP'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`${styles.priorityBtn} ${priority === p ? styles.priorityActive : ''} ${priority === 'Urgent' && p === 'Urgent' ? styles.urgentActive : ''} ${priority === 'VIP' && p === 'VIP' ? styles.vipActive : ''}`}
                                            onClick={() => setPriority(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.field} style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sendSampleFirst} 
                                        onChange={e => setSendSampleFirst(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Send Sample First (Generate Challan)</span>
                                </label>
                            </div>
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Special Notes / Instructions</label>
                                <textarea 
                                    className={styles.selectTrigger}
                                    style={{ height: '80px', paddingTop: '10px', paddingBottom: '10px', resize: 'none' }}
                                    placeholder="Add any specific manufacturing details or shipping notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} type="button">Cancel</button>
                    <button 
                        className={styles.createBtn} 
                        onClick={handleSubmit} 
                        disabled={loading || !selectedCustomer || !selectedDesign || !quantity}
                    >
                        {loading ? 'Creating Order...' : 'Create Order'}
                    </button>
                </div>
            </div>
            <DesignPickerModal 
                isOpen={isDesignPickerOpen}
                onClose={() => setIsDesignPickerOpen(false)}
                onSelect={handleDesignSelect}
                selectedDesignId={selectedDesign?.id}
            />
        </div>
    );

    return createPortal(modalContent, document.body);
}
