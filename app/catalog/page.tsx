'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import styles from './Catalog.module.css';

interface Design {
    id: number;
    name: string;
    image_url: string;
    price_per_meter: number;
    available: number;
    created_at: number;
}

export default function CatalogPage() {
    const { user } = useAuth();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [availableFilters] = useState<FilterDefinition[]>([
        { id: 'available', label: 'Availability', type: 'select', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
        ), options: [
            { value: '1', label: 'In Stock' },
            { value: '0', label: 'Out of Stock' },
        ]},
        { id: 'price', label: 'Price', type: 'number', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
        )},
    ]);
    const [showDesignModal, setShowDesignModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editingDesign, setEditingDesign] = useState<Design | null>(null);
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
    const [designForm, setDesignForm] = useState({
        name: '',
        imageUrl: '',
        pricePerMeter: 0,
        available: true,
    });
    const [orderForm, setOrderForm] = useState({
        quantityMeters: 0,
    });

    const isAdmin = user?.role === 'admin';
    const isCustomer = user?.role === 'customer';

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const search = params.get('search');
        if (search) {
            setSearchTerm(search);
        }
        fetchDesigns(activeFilters, search || searchTerm);
    }, []);

    const handleApplyFilters = (filters: FilterRow[]) => {
        setActiveFilters(filters);
        fetchDesigns(filters);
    };

    const handleRemoveFilter = (id: string) => {
        const newFilters = activeFilters.filter(f => f.id !== id);
        setActiveFilters(newFilters);
        fetchDesigns(newFilters);
    };

    const fetchDesigns = async (filters: FilterRow[] = [], search: string = searchTerm) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);

            filters.forEach(f => {
                if (f.fieldId === 'available') {
                    params.append('available', f.value);
                } else if (f.fieldId === 'price') {
                    if (f.operator === 'is') {
                        params.set('minPrice', f.value);
                        params.set('maxPrice', f.value);
                    } else if (f.operator === 'greater than') {
                        params.set('minPrice', f.value);
                    } else if (f.operator === 'less than') {
                        params.set('maxPrice', f.value);
                    } else if (f.operator === 'between') {
                        if (f.value?.start) params.set('minPrice', f.value.start);
                        if (f.value?.end) params.set('maxPrice', f.value.end);
                    }
                }
            });

            const res = await fetch(`/api/designs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setDesigns(data.designs);
            }
        } catch (error) {
            console.error('Failed to fetch designs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDesign = () => {
        setEditingDesign(null);
        setDesignForm({ name: '', imageUrl: '', pricePerMeter: 0, available: true });
        setShowDesignModal(true);
    };

    const handleEditDesign = (design: Design) => {
        setEditingDesign(design);
        setDesignForm({
            name: design.name,
            imageUrl: design.image_url,
            pricePerMeter: design.price_per_meter,
            available: design.available === 1,
        });
        setShowDesignModal(true);
    };

    const handleSubmitDesign = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingDesign ? `/api/designs/${editingDesign.id}` : '/api/designs';
            const method = editingDesign ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(designForm),
            });

            if (res.ok) {
                setShowDesignModal(false);
                fetchDesigns(activeFilters);
            }
        } catch (error) {
            console.error('Save design error:', error);
        }
    };

    const handleDeleteDesign = async (designId: number) => {
        

        try {
            const res = await fetch(`/api/designs/${designId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchDesigns(activeFilters);
            }
        } catch (error) {
            console.error('Delete design error:', error);
        }
    };

    const handleOrderClick = (design: Design) => {
        setSelectedDesign(design);
        setOrderForm({ quantityMeters: 0 });
        setShowOrderModal(true);
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedDesign || !user) return;

        try {
            // Get customer ID for this user
            const customerRes = await fetch('/api/customers');
            if (!customerRes.ok) {
                console.log('Please complete your customer profile first');
                return;
            }

            const customerData = await customerRes.json();
            const customer = customerData.customers.find((c: any) => c.user_id === user.id);

            if (!customer) {
                console.log('Customer profile not found');
                return;
            }

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    designId: selectedDesign.id,
                    quantityMeters: orderForm.quantityMeters,
                }),
            });

            if (res.ok) {
                setShowOrderModal(false);
                console.log('Order placed successfully! Check "My Orders" to track your order.');
            } else {
                console.log('Failed to place order. Please try again.');
            }
        } catch (error) {
            console.error('Order submission error:', error);
            console.log('Failed to place order. Please try again.');
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading catalog...</div>;
    }

    return (
        <div className={styles.catalogPage}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        {isCustomer ? 'Shop Designs' : 'Catalog'}
                    </h1>
                    <p className={styles.subtitle}>
                        {isCustomer
                            ? 'Browse our collection and place orders'
                            : 'Manage fabric designs and pricing'}
                    </p>
                </div>
                {isAdmin && (
                    <button className="action-btn-primary" onClick={handleAddDesign}>
                        <Plus size={16} />
                        <span>Add Design</span>
                    </button>
                )}
            </div>

            <div className={styles.filterControls}>
                <div className={styles.searchWrapper}>
                    <Input
                        placeholder="Search designs..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            fetchDesigns(activeFilters, e.target.value);
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

            {designs.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎨</div>
                    <h3 className={styles.emptyTitle}>No Designs Available</h3>
                    <p className={styles.emptyText}>
                        {isAdmin
                            ? 'Add your first design to get started'
                            : 'No designs available at the moment'}
                    </p>
                </div>
            ) : (
                <div className={styles.designsGrid}>
                    {designs.map((design) => (
                        <Card key={design.id} className={styles.designCard}>
                            <div className={styles.designImage}>
                                {design.image_url ? (
                                    <img src={design.image_url} alt={design.name} />
                                ) : (
                                    <div className={styles.placeholderImage}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                    </div>
                                )}
                                {isAdmin && (
                                    <div className={styles.designActions}>
                                        <button
                                            className={styles.actionButton}
                                            onClick={() => handleEditDesign(design)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            className={`${styles.actionButton} ${styles.deleteButton}`}
                                            onClick={() => handleDeleteDesign(design.id)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.designInfo}>
                                <div className={styles.designHeader}>
                                    <h3 className={styles.designName}>{design.name}</h3>
                                    {isAdmin && (
                                        <Badge status={design.available === 1 ? 'completed' : 'pending'} />
                                    )}
                                </div>

                                <div className={styles.designPrice}>₹{design.price_per_meter}/meter</div>

                                {isCustomer && (
                                    <Button
                                        variant="primary"
                                        size="small"
                                        fullWidth
                                        onClick={() => handleOrderClick(design)}
                                    >
                                        Place Order
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Admin Design Modal */}
            <Modal
                isOpen={showDesignModal}
                onClose={() => setShowDesignModal(false)}
                title={editingDesign ? 'Edit Design' : 'Add New Design'}
            >
                <form onSubmit={handleSubmitDesign}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                        <Input
                            label="Design Name"
                            value={designForm.name}
                            onChange={(e) => setDesignForm({ ...designForm, name: e.target.value })}
                            required
                        />
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-1)', color: 'var(--color-text-primary)' }}>
                                Design Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setDesignForm({ ...designForm, imageUrl: reader.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                style={{ display: 'block', width: '100%', padding: 'var(--spacing-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)' }}
                            />
                            {designForm.imageUrl && (
                                <div style={{ marginTop: 'var(--spacing-2)' }}>
                                    <img src={designForm.imageUrl} alt="Preview" style={{ maxHeight: '100px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                                </div>
                            )}
                        </div>
                        <Input
                            label="Price per Meter (₹)"
                            type="number"
                            value={designForm.pricePerMeter.toString()}
                            onChange={(e) =>
                                setDesignForm({ ...designForm, pricePerMeter: parseFloat(e.target.value) || 0 })
                            }
                            required
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={designForm.available}
                                onChange={(e) => setDesignForm({ ...designForm, available: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                Available for customers
                            </span>
                        </label>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--spacing-3)',
                            marginTop: 'var(--spacing-6)',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <Button variant="ghost" type="button" onClick={() => setShowDesignModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingDesign ? 'Update' : 'Add'} Design
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Customer Order Modal */}
            <Modal
                isOpen={showOrderModal}
                onClose={() => setShowOrderModal(false)}
                title="Place Order"
            >
                {selectedDesign && (
                    <form onSubmit={handleSubmitOrder}>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-2)' }}>
                                {selectedDesign.name}
                            </h3>
                            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
                                ₹{selectedDesign.price_per_meter}/meter
                            </p>
                        </div>

                        <Input
                            label="Quantity (meters)"
                            type="number"
                            min="1"
                            value={orderForm.quantityMeters.toString()}
                            onChange={(e) =>
                                setOrderForm({ ...orderForm, quantityMeters: parseFloat(e.target.value) || 0 })
                            }
                            required
                        />

                        {orderForm.quantityMeters > 0 && (
                            <div
                                style={{
                                    marginTop: 'var(--spacing-4)',
                                    padding: 'var(--spacing-4)',
                                    background: 'var(--color-bg-surface)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        Total Price:
                                    </span>
                                    <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>
                                        ₹{(orderForm.quantityMeters * selectedDesign.price_per_meter).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                gap: 'var(--spacing-3)',
                                marginTop: 'var(--spacing-6)',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <Button variant="ghost" type="button" onClick={() => setShowOrderModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={orderForm.quantityMeters <= 0}>
                                Place Order
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
