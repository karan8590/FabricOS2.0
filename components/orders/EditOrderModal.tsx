'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronDown, Calendar, AlertCircle, CheckCircle2, Plus, ShoppingBag, User, Settings2, History, Package } from 'lucide-react';
import styles from './EditOrderModal.module.css';
import DesignPickerModal from './DesignPickerModal';

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

interface EditOrderModalProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditOrderModal({ order, isOpen, onClose, onSuccess }: EditOrderModalProps) {
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);
    const [mounted, setMounted] = useState(false);

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [pricePerUnit, setPricePerUnit] = useState<string>('');
    const [orderDate, setOrderDate] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [priority, setPriority] = useState<'Normal' | 'Urgent' | 'VIP'>('Normal');
    const [notes, setNotes] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Advanced Cost Breakdown State
    const [baseAmount, setBaseAmount] = useState<string>('');
    const [printingCost, setPrintingCost] = useState<string>('');
    const [embroideryCostCharged, setEmbroideryCostCharged] = useState<string>('');
    const [dyeingCostCharged, setDyeingCostCharged] = useState<string>('');
    const [additionalCharges, setAdditionalCharges] = useState<string>('');
    const [discount, setDiscount] = useState<string>('');
    const [gstRate, setGstRate] = useState<string>('5');
    const [gstAmount, setGstAmount] = useState<string>('');
    const [showAdvancedCosts, setShowAdvancedCosts] = useState(false);

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
        if (isOpen && order) {
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
    }, [isOpen, order, onClose]);

    // Pre-fill data when order changes
    useEffect(() => {
        if (order) {
            setQuantity(order.quantity_meters?.toString() || '');
            setPricePerUnit(order.price_per_unit?.toString() || order.rate_per_meter?.toString() || '');
            setPriority(order.priority || 'Normal');
            setNotes(order.notes || '');
            
            setBaseAmount(order.base_amount?.toString() || '');
            setPrintingCost(order.printing_cost?.toString() || '');
            setEmbroideryCostCharged(order.embroidery_cost_charged?.toString() || '');
            setDyeingCostCharged(order.dyeing_cost_charged?.toString() || '');
            setAdditionalCharges(order.additional_charges?.toString() || '');
            setDiscount(order.discount?.toString() || '');
            setGstRate(order.gst_rate?.toString() || '5');
            setGstAmount(order.gst_amount?.toString() || '');

            if (order.delivery_date) {
                setDeliveryDate(new Date(order.delivery_date * 1000).toISOString().split('T')[0]);
            }
            if (order.order_date || order.created_at) {
                setOrderDate(new Date((order.order_date || order.created_at) * 1000).toISOString().split('T')[0]);
            }
        }
    }, [order]);

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
        setErrors(prev => ({...prev, design: ''}));
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
                
                // Set initial customer from order
                const found = data.customers.find((c: Customer) => c.id === order.customer_id);
                if (found) setSelectedCustomer(found);
            }
            
            if (designRes.ok) {
                const data = await designRes.json();
                setDesigns(data.designs);
                
                // Set initial design from order
                const found = data.designs.find((d: Design) => d.id === order.design_id);
                if (found) setSelectedDesign(found);
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
        
        let b = parseFloat(baseAmount);
        if (isNaN(b)) b = q * p;
        
        const pr = parseFloat(printingCost) || 0;
        const em = parseFloat(embroideryCostCharged) || 0;
        const dy = parseFloat(dyeingCostCharged) || 0;
        const ad = parseFloat(additionalCharges) || 0;
        const di = parseFloat(discount) || 0;
        
        const subtotal = b + pr + em + dy + ad;
        const taxable = subtotal - di;
        
        const gRate = parseFloat(gstRate) || 0;
        let gAmt = parseFloat(gstAmount);
        if (isNaN(gAmt)) gAmt = taxable * (gRate / 100);
        
        const finalTotal = taxable + gAmt;

        return finalTotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    }, [quantity, pricePerUnit, baseAmount, printingCost, embroideryCostCharged, dyeingCostCharged, additionalCharges, discount, gstRate, gstAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};
        if (!selectedCustomer) newErrors.customer = 'Please select a customer';
        if (!selectedDesign) newErrors.design = 'Please select a design';
        if (!quantity || parseFloat(quantity) <= 0) newErrors.quantity = 'Quantity is required and must be > 0';
        if (!pricePerUnit || parseFloat(pricePerUnit) <= 0) newErrors.pricePerUnit = 'Price per unit is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    designId: selectedDesign.id,
                    quantity_meters: parseFloat(quantity),
                    pricePerUnit: parseFloat(pricePerUnit),
                    delivery_date: deliveryDate ? Math.floor(new Date(deliveryDate).getTime() / 1000) : null,
                    order_date: orderDate ? Math.floor(new Date(orderDate).getTime() / 1000) : null,
                    priority,
                    notes,
                    base_amount: baseAmount ? parseFloat(baseAmount) : null,
                    printing_cost: printingCost ? parseFloat(printingCost) : 0,
                    embroidery_cost_charged: embroideryCostCharged ? parseFloat(embroideryCostCharged) : 0,
                    dyeing_cost_charged: dyeingCostCharged ? parseFloat(dyeingCostCharged) : 0,
                    additional_charges: additionalCharges ? parseFloat(additionalCharges) : 0,
                    discount: discount ? parseFloat(discount) : 0,
                    gst_rate: gstRate ? parseFloat(gstRate) : 5,
                    gst_amount: gstAmount ? parseFloat(gstAmount) : null
                }),
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update order');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Failed to update order');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !mounted || !order) return null;

    const modalContent = (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(255, 204, 0, 0.1)', color: '#FFCC00', padding: '8px', borderRadius: '10px' }}>
                            <Settings2 size={20} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Edit Order #{order.order_number || order.id}</h2>
                            <p className={styles.subtitle}>Editing existing manufacturing order</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className={styles.statusPill}>
                            <div className={styles.statusDot} />
                            <span>{order.status}</span>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
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
                                        className={`${styles.selectTrigger} ${errors.customer ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`} 
                                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                                        data-error={!!errors.customer}
                                    >
                                        <span>{selectedCustomer ? selectedCustomer.name : 'Choose a customer...'}</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    {errors.customer && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.customer}</p>}
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
                                                        setErrors(prev => ({...prev, customer: ''}));
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
                            <Package size={14} />
                            <span className={styles.sectionTitle}>Section 2: Design Details</span>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Fabric / Design Catalog</label>
                                <div className={styles.selectWrapper}>
                                    <div 
                                        className={`${styles.selectTrigger} ${errors.design ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`} 
                                        onClick={() => setIsDesignPickerOpen(true)}
                                        style={{ height: '52px', borderStyle: 'dashed', borderColor: errors.design ? '#ef4444' : (selectedDesign ? '#2563eb' : '#333') }}
                                        data-error={!!errors.design}
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
                                    {errors.design && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.design}</p>}
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Quantity (Meters)</label>
                                <input 
                                    type="number"
                                    className={`${styles.selectTrigger} ${errors.quantity ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                    placeholder="0.00"
                                    value={quantity}
                                    onChange={e => { setQuantity(e.target.value); setErrors(prev => ({...prev, quantity: ''})); }}
                                    step="0.01"
                                    data-error={!!errors.quantity}
                                />
                                {errors.quantity && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.quantity}</p>}
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Price per Meter (₹)</label>
                                <input 
                                    type="number"
                                    className={`${styles.selectTrigger} ${errors.pricePerUnit ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                    placeholder="0.00"
                                    value={pricePerUnit}
                                    onChange={e => { setPricePerUnit(e.target.value); setErrors(prev => ({...prev, pricePerUnit: ''})); }}
                                    data-error={!!errors.pricePerUnit}
                                />
                                {errors.pricePerUnit && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.pricePerUnit}</p>}
                            </div>
                        </div>

                        <div className={styles.totalBar}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className={styles.totalLabel}>Recalculated Order Value</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>Inclusive of all specified costs and taxes</span>
                            </div>
                            <span className={styles.totalValue}>₹{totalCalculation}</span>
                        </div>
                    </div>

                    {/* SECTION 2.5: Cost Breakdown (Optional) */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader} style={{ cursor: 'pointer' }} onClick={() => setShowAdvancedCosts(!showAdvancedCosts)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShoppingBag size={14} />
                                <span className={styles.sectionTitle}>Advanced Cost Breakdown (Optional)</span>
                            </div>
                            <ChevronDown size={16} style={{ transform: showAdvancedCosts ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                        </div>
                        {showAdvancedCosts && (
                            <div className={styles.grid} style={{ marginTop: '16px' }}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Base Amount Override</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="Auto if empty" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Printing Cost</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="0" value={printingCost} onChange={e => setPrintingCost(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Embroidery Cost</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="0" value={embroideryCostCharged} onChange={e => setEmbroideryCostCharged(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Dyeing Cost</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="0" value={dyeingCostCharged} onChange={e => setDyeingCostCharged(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Additional Charges</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="0" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Discount</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>GST Rate (%)</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="5" value={gstRate} onChange={e => setGstRate(e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>GST Amount Override</label>
                                    <input type="number" className={styles.selectTrigger} placeholder="Auto if empty" value={gstAmount} onChange={e => setGstAmount(e.target.value)} />
                                </div>
                            </div>
                        )}
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
                        disabled={loading}
                    >
                        {loading ? 'Saving Changes...' : 'Save Changes'}
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
