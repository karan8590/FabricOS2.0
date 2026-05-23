'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import StatWidget from '@/components/ui/StatWidget';
import CustomerQuickView from '@/components/customers/CustomerQuickView';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import { Eye, Plus } from 'lucide-react';
import styles from './Customers.module.css';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [activeWidget, setActiveWidget] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Quick View State
    const [quickViewCustomer, setQuickViewCustomer] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [availableFilters] = useState<FilterDefinition[]>([
        { id: 'behavior', label: 'Behavior', type: 'select', options: [
            { value: 'Reliable', label: 'Reliable' },
            { value: 'Slow Payer', label: 'Slow Payer' },
            { value: 'High Risk', label: 'High Risk' },
            { value: 'New', label: 'New' },
        ]},
        { id: 'ltv', label: 'LTV', type: 'number' },
        { id: 'outstanding', label: 'Due Amount', type: 'number' },
    ]);
    const router = useRouter();

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async (filters: FilterRow[] = [], search: string = searchTerm) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);

            filters.forEach(f => {
                if (f.fieldId === 'behavior') {
                    params.append('behavior', f.value);
                } else if (f.fieldId === 'ltv') {
                    if (f.operator === 'is') {
                        params.set('minLtv', f.value);
                        params.set('maxLtv', f.value);
                    } else if (f.operator === 'greater than') {
                        params.set('minLtv', f.value);
                    } else if (f.operator === 'less than') {
                        params.set('maxLtv', f.value);
                    } else if (f.operator === 'between') {
                        if (f.value?.start) params.set('minLtv', f.value.start);
                        if (f.value?.end) params.set('maxLtv', f.value.end);
                    }
                } else if (f.fieldId === 'outstanding') {
                    if (f.operator === 'is') {
                        params.set('minOutstanding', f.value);
                        params.set('maxOutstanding', f.value);
                    } else if (f.operator === 'greater than') {
                        params.set('minOutstanding', f.value);
                    } else if (f.operator === 'less than') {
                        params.set('maxOutstanding', f.value);
                    } else if (f.operator === 'between') {
                        if (f.value?.start) params.set('minOutstanding', f.value.start);
                        if (f.value?.end) params.set('maxOutstanding', f.value.end);
                    }
                }
            });

            const res = await fetch(`/api/customers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers);
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${Math.round(val)}`;
    };

    const searchFilteredCustomers = useMemo(() => {
        return customers.filter(
            (customer) =>
                (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.phone && customer.phone.includes(searchTerm))
        );
    }, [customers, searchTerm]);

    const stats = useMemo(() => {
        const totalCustomers = searchFilteredCustomers.length;
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeCustomers = searchFilteredCustomers.filter(c => 
            c.last_order_date && (new Date(c.last_order_date * 1000) >= thirtyDaysAgo)
        );
        
        const topCustomer = searchFilteredCustomers.reduce((top, c) => 
            (c.ltv || 0) > (top?.ltv || 0) ? c : top, null
        );
        
        const newThisMonth = searchFilteredCustomers.filter(c => {
            const d = new Date(c.created_at * 1000);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        return { 
            totalCustomers, 
            activeCount: activeCustomers.length,
            topCustomer,
            newThisMonth: newThisMonth.length
        };
    }, [searchFilteredCustomers]);

    const filteredCustomers = useMemo(() => {
        let result = searchFilteredCustomers;

        if (activeWidget === 'active') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            result = result.filter(c => 
                c.last_order_date && (new Date(c.last_order_date * 1000) >= thirtyDaysAgo)
            );
        } else if (activeWidget === 'top') {
            result = [...result].sort((a, b) => (b.ltv || 0) - (a.ltv || 0));
        } else if (activeWidget === 'new') {
            const now = new Date();
            result = result.filter(c => {
                const d = new Date(c.created_at * 1000);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).sort((a, b) => b.created_at - a.created_at);
        }

        return result;
    }, [searchFilteredCustomers, activeWidget]);

    const handleApplyFilters = (filters: FilterRow[]) => {
        setActiveFilters(filters);
        fetchCustomers(filters);
    };

    const handleRemoveFilter = (id: string) => {
        const newFilters = activeFilters.filter(f => f.id !== id);
        setActiveFilters(newFilters);
        fetchCustomers(newFilters);
    };

    const handleCustomerClick = (customerId: number) => {
        router.push(`/customers/${customerId}`);
    };

    const handleQuickView = (e: React.MouseEvent, customer: any) => {
        e.stopPropagation();
        setQuickViewCustomer(customer);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setQuickViewCustomer(null), 300);
    };

    const widgetConfig = [
        { id: 'total', label: 'Total Customers', value: stats.totalCustomers, color: 'blue', icon: 'users' },
        { id: 'active', label: 'Active', value: stats.activeCount, color: 'green', icon: 'check' },
        { id: 'top', label: 'Top Customer', value: stats.topCustomer ? formatCurrency(stats.topCustomer.ltv) : '₹0', color: 'purple', icon: 'trophy', secondary: stats.topCustomer?.name },
        { id: 'new', label: 'New This Month', value: stats.newThisMonth, color: 'orange', icon: 'plus' },
    ];

    return (
        <div className={styles.customersPage}>
            <CustomerQuickView 
                customer={quickViewCustomer}
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                onViewFullOrders={handleCustomerClick}
            />

            <div className={styles.header}>
                <h1 className={styles.title}>Customers</h1>
                <p className={styles.subtitle}>Manage your customer relationships</p>
            </div>

            <div className={styles.widgetRow}>
                {widgetConfig.map((w) => (
                    <StatWidget
                        key={w.id}
                        label={w.label}
                        value={w.value}
                        secondaryText={w.secondary}
                        isSelected={activeWidget === w.id}
                        accentColor={
                            w.color === 'blue' ? '#0071E3' :
                            w.color === 'green' ? '#34C759' :
                            w.color === 'purple' ? '#AF52DE' : '#FF9500'
                        }
                        accentBg={
                            w.color === 'blue' ? 'rgba(0,113,227,0.04)' :
                            w.color === 'green' ? 'rgba(52,199,89,0.04)' :
                            w.color === 'purple' ? 'rgba(175,82,222,0.04)' : 'rgba(255,149,0,0.04)'
                        }
                        onClick={() => setActiveWidget(activeWidget === w.id ? null : w.id)}
                        badge={
                            w.id === 'total' ? `+3 this month` :
                            w.id === 'active' ? `${Math.round((stats.activeCount / (stats.totalCustomers || 1)) * 100)}% of total` :
                            w.id === 'top' ? 'Highest value' : '▲ 25%'
                        }
                        badgeType={
                            w.id === 'active' ? (stats.activeCount / (stats.totalCustomers || 1) > 0.5 ? 'positive' : 'neutral') :
                            w.id === 'total' ? 'positive' : 'neutral'
                        }
                        icon={
                            w.icon === 'users' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> :
                            w.icon === 'check' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> :
                            w.icon === 'trophy' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"/><path d="M12 2a8 8 0 00-8 8c0 3 2.5 3 2.5 3h11s2.5 0 2.5-3a8 8 0 00-8-8z"/></svg> :
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                        }
                    />
                ))}
            </div>

            {activeWidget && (
                <div className={styles.activeWidgetPill}>
                    <span>Showing: <strong>{widgetConfig.find(w => w.id === activeWidget)?.label} Customers</strong></span>
                    <button className={styles.closePill} onClick={() => setActiveWidget(null)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            )}

            <div className={styles.filterControls}>
                <div className={styles.searchWrapper}>
                    <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                    />
                </div>
                <AdvancedFilter 
                    availableFilters={availableFilters}
                    onApply={handleApplyFilters}
                    activeFilters={activeFilters}
                    resultsCount={filteredCustomers.length}
                    resultsLabel="customers"
                />
                <div style={{ marginLeft: 'auto' }}>
                    <button className="action-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={16} />
                        <span>Add Customer</span>
                    </button>
                </div>
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
                        } else { valueLabel = filter.value; }
                        const operatorLabel = filter.operator === 'is' ? '' : ` ${filter.operator}`;
                        return (
                            <div key={filter.id} className={styles.filterChip}>
                                <span className={styles.chipLabel}>{field?.label}{operatorLabel}:</span> {valueLabel}
                                <button onClick={() => handleRemoveFilter(filter.id)} className={styles.clearFilterBtn}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        );
                    })}
                    <button className={styles.clearAllBtn} onClick={() => handleApplyFilters([])}>Clear All</button>
                </div>
            )}

            {loading ? (
                <div className={styles.loading}>Loading customers...</div>
            ) : (
                <div className={styles.customersGrid}>
                    {filteredCustomers.length === 0 ? (
                        <div className={styles.emptyState}><p>No customers found</p></div>
                    ) : (
                        filteredCustomers.map((customer) => (
                            <div key={customer.id} onClick={() => handleCustomerClick(customer.id)} className={`${styles.customerCard} ${activeWidget === 'top' && customer.id === stats.topCustomer?.id ? styles.topCustomerCard : ''}`}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardMain}>
                                        <div className={styles.avatarZone}><div className={styles.customerAvatar}>{customer.name.charAt(0).toUpperCase()}</div></div>
                                        <div className={styles.infoZone}>
                                            <h3 className={styles.customerName}>{customer.name}</h3>
                                            <p className={styles.customerPhone}>{customer.phone}</p>
                                        </div>
                                    </div>
                                    <div className={styles.actionZone}>
                                        <button 
                                            className={styles.quickViewBtn} 
                                            onClick={(e) => handleQuickView(e, customer)}
                                            title="Quick View"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {customer.behavior && <span className={`${styles.badge} ${customer.behavior === 'High Risk' ? styles.badgeRisk : customer.behavior === 'Slow Payer' ? styles.badgeSlow : customer.behavior === 'Reliable' ? styles.badgeReliable : styles.badgeNew}`}>{customer.behavior}</span>}
                                    </div>
                                </div>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statBlock}><span className={`${styles.statValue} ${styles.textBlue}`}>{customer.total_orders}</span><span className={styles.statLabel}>Orders</span></div>
                                    <div className={styles.statBlock}><span className={styles.statValue}>₹{(customer.ltv || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className={styles.statLabel}>LTV</span></div>
                                    <div className={styles.statBlock}><span className={`${styles.statValue} ${customer.outstanding_amount > 0 ? styles.textOrange : ''}`}>₹{Math.max(0, customer.outstanding_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className={styles.statLabel}>Due</span></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchCustomers()}
            />
        </div>
    );
}
