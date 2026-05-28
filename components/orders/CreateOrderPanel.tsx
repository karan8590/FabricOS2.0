'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronDown, Calendar, AlertCircle, CheckCircle2, Plus, ShoppingBag, User, Settings2, Package } from 'lucide-react';
import styles from './CreateOrderPanel.module.css';
import { celebrateSmall, celebrateMilestone } from '@/lib/confetti';
import { CatalogView } from '@/app/catalog/page';
import type { CatalogDesign, CatalogVariant } from '@/components/catalog/CatalogDesignCard';

export interface SelectedDesignPayload {
    id: number;
    name: string;
    price_per_meter: number;
    image_url?: string;
    category?: string;
    code?: string;
    design_variant_id?: number;
    variant_color?: string;
    variant_sku?: string;
    variant_rate?: number;
    variant_hex?: string;
    available_stock?: number;
}

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
    const [firms, setFirms] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedDesign, setSelectedDesign] = useState<SelectedDesignPayload | null>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [pricePerUnit, setPricePerUnit] = useState<string>('');
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [sendSampleFirst, setSendSampleFirst] = useState(false);
    const [fabricType, setFabricType] = useState<string>('Polyester');
    const [billingFirmId, setBillingFirmId] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Dropdown States
    const [customerSearch, setCustomerSearch] = useState('');
    const [designSearch, setDesignSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isDesignDropdownOpen, setIsDesignDropdownOpen] = useState(false);

    const customerDropdownRef = useRef<HTMLDivElement>(null);

    const [isDesignPickerOpen, setIsDesignPickerOpen] = useState(false);
    
    // Swipe-to-dismiss state
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);

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

    const handleDesignSelect = (design: SelectedDesignPayload) => {
        setSelectedDesign(design);
        // Auto-populate price: variant rate takes priority over base rate
        const rate = design.variant_rate || design.price_per_meter || 0;
        setPricePerUnit(rate.toString());

        // Auto-fill fabric type if available (Polyester or Viscose)
        if (design.category) {
            const lowerCategory = design.category.toLowerCase();
            if (lowerCategory.includes('viscose')) {
                setFabricType('Viscose');
            } else if (lowerCategory.includes('polyester')) {
                setFabricType('Polyester');
            }
        }

        setIsDesignPickerOpen(false);
        setErrors(prev => ({...prev, design: ''}));
    };

    const fetchInitialData = async () => {
        try {
            const [custRes, designRes, firmsRes] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/designs'),
                fetch('/api/firms')
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

            if (firmsRes.ok) {
                const data = await firmsRes.json();
                setFirms(data);
                const saved = localStorage.getItem('selectedFirmId');
                if (saved && data.find((f: any) => f.id.toString() === saved)) {
                    setBillingFirmId(saved);
                } else if (data.length > 0) {
                    const defaultFirm = data.find((f: any) => f.is_default) || data[0];
                    setBillingFirmId(defaultFirm.id.toString());
                }
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
        const subtotal = q * p;
        const gst = subtotal * 0.05;
        const finalTotal = subtotal + gst;
        return finalTotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    }, [quantity, pricePerUnit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!selectedCustomer) newErrors.customer = 'Please select a customer';
        if (!selectedDesign) newErrors.design = 'Please select a design';
        if (!billingFirmId) newErrors.billingFirmId = 'Billing firm is required';
        if (!quantity || parseFloat(quantity) <= 0) newErrors.quantity = 'Quantity is required and must be > 0';
        if (!pricePerUnit || parseFloat(pricePerUnit) <= 0) newErrors.pricePerUnit = 'Price per unit is required';
        if (!fabricType) newErrors.fabricType = 'Fabric type is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                        customerId: selectedCustomer.id,
                        designId: selectedDesign.id,
                        billingFirmId: parseInt(billingFirmId),
                        quantityMeters: parseFloat(quantity),
                        pricePerUnit: parseFloat(pricePerUnit),
                        delivery_date: deliveryDate ? Math.floor(new Date(deliveryDate).getTime() / 1000) : null,
                        order_date: orderDate ? Math.floor(new Date(orderDate).getTime() / 1000) : null,
                        sendSampleFirst,
                        fabric_type: fabricType,
                        // Catalog variant fields (optional)
                        designVariantId: selectedDesign.design_variant_id || null,
                        variantColor: selectedDesign.variant_color || null,
                        variantSku: selectedDesign.variant_sku || null,
                    }),
            });

            if (res.ok) {
                const data = await res.json();
                
                if (data.totalOrders && data.totalOrders > 0 && data.totalOrders % 100 === 0) {
                    celebrateMilestone(`confetti_milestone_${data.totalOrders}`);
                    // Silent success
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
                console.log(data.error || 'Failed to create order');
            }
        } catch (error) {
            console.error('Create order error:', error);
            console.log('Failed to create order');
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
        setSendSampleFirst(false);
        setFabricType('Polyester');
        setCustomerSearch('');
        setDesignSearch('');
        setErrors({});
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.innerWidth > 768) return;
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || window.innerWidth > 768) return;
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) setCurrentY(deltaY);
    };

    const handleTouchEnd = () => {
        if (!isDragging || window.innerWidth > 768) return;
        setIsDragging(false);
        if (currentY > 150) onClose();
        setCurrentY(0);
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className={styles.overlay} onClick={onClose}>
            <div 
                className={styles.panel} 
                style={isDragging && window.innerWidth <= 768 ? { transform: `translateY(${currentY}px)`, transition: 'none' } : {}}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className={styles.mobileSheetHandle}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
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
                            <div className={styles.field} style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                                <label className={styles.label}>Billing Firm *</label>
                                <select 
                                    className={`${styles.selectTrigger} ${errors.billingFirmId ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                    value={billingFirmId}
                                    onChange={e => { setBillingFirmId(e.target.value); setErrors(prev => ({...prev, billingFirmId: ''})); }}
                                    data-error={!!errors.billingFirmId}
                                    style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
                                >
                                    <option value="" disabled>Select a billing firm...</option>
                                    {firms.map((f: any) => (
                                        <option key={f.id} value={f.id.toString()}>{f.firm_name} (GST: {f.gst_number || 'N/A'})</option>
                                    ))}
                                </select>
                                {errors.billingFirmId && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.billingFirmId}</p>}
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
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', opacity: 0.7 }}>
                                                        <span>{selectedDesign.category} • {selectedDesign.code}</span>
                                                        {selectedDesign.available_stock !== undefined && (
                                                            <>
                                                                <span>•</span>
                                                                <span style={{ color: selectedDesign.available_stock > 0 ? '#10b981' : '#ef4444' }}>
                                                                    {selectedDesign.available_stock}m in stock
                                                                </span>
                                                            </>
                                                        )}
                                                        {selectedDesign.variant_color && (
                                                            <>
                                                                <span>•</span>
                                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedDesign.variant_hex || '#888', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)', flexShrink: 0 }} />
                                                                <span>{selectedDesign.variant_color}</span>
                                                                {selectedDesign.variant_sku && <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>{selectedDesign.variant_sku}</span>}
                                                            </>
                                                        )}
                                                    </div>
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
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Fabric Type</label>
                                <select 
                                    className={`${styles.selectTrigger} ${errors.fabricType ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                    value={fabricType}
                                    onChange={e => { setFabricType(e.target.value); setErrors(prev => ({...prev, fabricType: ''})); }}
                                    data-error={!!errors.fabricType}
                                    style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
                                >
                                    <option value="Polyester">Polyester</option>
                                    <option value="Viscose">Viscose</option>
                                </select>
                                {errors.fabricType && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.fabricType}</p>}
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
                                <span className={styles.totalLabel}>Auto-calculated Order Value</span>
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
                        {loading ? 'Creating Order...' : 'Create Order'}
                    </button>
                </div>
            </div>
            
            {/* New Catalog Picker Modal */}
            {isDesignPickerOpen && (
                <div 
                    className={styles.overlay} 
                    style={{ zIndex: 3000 }} 
                    onClick={() => setIsDesignPickerOpen(false)}
                >
                    <div 
                        className={styles.panel}
                        style={{ width: '90vw', maxWidth: '1200px', height: '90vh', maxHeight: '800px', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.header}>
                            <h2 className={styles.title}>Browse Catalog</h2>
                            <button className={styles.closeBtn} onClick={() => setIsDesignPickerOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#f8fafc' }}>
                            <CatalogView 
                                isPickerMode 
                                onClosePicker={() => setIsDesignPickerOpen(false)}
                                onSelectDesign={(design: CatalogDesign, variant?: CatalogVariant) => {
                                    handleDesignSelect({
                                        id: Number(design.id),
                                        name: design.design_name,
                                        price_per_meter: variant?.rate || design.base_rate,
                                        image_url: variant?.variant_image_url || design.image_url,
                                        category: design.fabric_type || design.category,
                                        code: design.design_code,
                                        available_stock: variant?.stock_quantity ?? design.total_stock,
                                        design_variant_id: variant ? Number(variant.id) : undefined,
                                        variant_color: variant?.color_name,
                                        variant_sku: variant?.sku,
                                        variant_hex: variant?.color_hex,
                                        variant_rate: variant?.rate
                                    });
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
