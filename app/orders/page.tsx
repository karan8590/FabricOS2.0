'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import OrderCard from '@/components/orders/OrderCard';
import OrdersTable from '@/components/orders/OrdersTable';
import Input from '@/components/ui/Input';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import StatWidget from '@/components/ui/StatWidget';
import CustomerContextHeader from '@/components/customers/CustomerContextHeader';
import { Calendar, X, Plus } from 'lucide-react';
import styles from './Orders.module.css';
import CreateOrderPanel from '@/components/orders/CreateOrderPanel';
import EditOrderModal from '@/components/orders/EditOrderModal';
import ViewingPeriodSelector from '@/components/ui/ViewingPeriodSelector';
import GroupedPeriodSection from '@/components/ui/GroupedPeriodSection';
import GenerateChallanModal from '@/components/challans/GenerateChallanModal';
import QRScannerModal from '@/components/ui/QRScannerModal';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

export default function OrdersPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const customerIdParam = searchParams.get('customerId');
    
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [showRecurringOnly, setShowRecurringOnly] = useState(false);
    
    // New Year/Month Selection State (Global)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
    const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
    const [challanOrderData, setChallanOrderData] = useState<any>(null);
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

    const [availableFilters, setAvailableFilters] = useState<FilterDefinition[]>([
        { id: 'date_range', label: 'Date Range', type: 'dateRange' },
        { id: 'status', label: 'Status', type: 'select', options: [
            { value: ORDER_STATUSES.DRAFT, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DRAFT] },
            { value: ORDER_STATUSES.CREATED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CREATED] },
            { value: ORDER_STATUSES.APPROVED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.APPROVED] },
            { value: ORDER_STATUSES.EMBROIDERY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.EMBROIDERY] },
            { value: ORDER_STATUSES.PRINTING, label: ORDER_STATUS_LABELS[ORDER_STATUSES.PRINTING] },
            { value: ORDER_STATUSES.DYEING, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DYEING] },
            { value: ORDER_STATUSES.READY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.READY] },
            { value: ORDER_STATUSES.DISPATCHED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DISPATCHED] },
            { value: ORDER_STATUSES.DELIVERED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DELIVERED] },
            { value: 'cancelled', label: 'Cancelled' },
        ]},
        { id: 'amount', label: 'Amount', type: 'number' },
        { id: 'search_text', label: 'Search Text', type: 'text' },
        { id: 'design', label: 'Design', type: 'text' },
    ]);

    const years = useMemo(() => {
        const ySet = new Set<string>();
        allOrders.forEach(o => {
            const effectiveDate = o.order_date || o.created_at;
            const date = new Date(effectiveDate * 1000);
            const y = date.getFullYear().toString();
            if (y && y !== 'NaN') ySet.add(y);
        });
        const currentYearStr = new Date().getFullYear().toString();
        ySet.add(currentYearStr);
        const sorted = Array.from(ySet).sort((a, b) => b.localeCompare(a));
        return ['All Years', ...sorted];
    }, [allOrders]);

    const months = [
        { value: 'all', label: 'All Months' },
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const res = await fetch('/api/customers');
                if (res.ok) {
                    const data = await res.json();
                    
                    // If customerId param exists, set selected customer
                    if (customerIdParam) {
                        const cust = data.customers.find((c: any) => c.id.toString() === customerIdParam);
                        if (cust) setSelectedCustomer(cust);
                    }

                    const customerOptions = data.customers.map((c: any) => ({
                        value: c.name,
                        label: c.name
                    }));
                    setAvailableFilters(prev => [
                        ...prev,
                        { id: 'customer_id', label: 'Customer', type: 'select', options: customerOptions }
                    ]);
                }
            } catch (error) {
                console.error('Failed to fetch filter data:', error);
            }
        };

        fetchFilterData();
        fetchOrders();
    }, [customerIdParam]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setAllOrders(data.orders || []);
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('Orders fetch failed:', res.status, errData);
            }
        } catch (error) {
            console.error('Orders fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleApplyFilters = (filters: FilterRow[]) => {
        setActiveFilters(filters);
    };

    const handleRemoveFilter = (id: string) => {
        setActiveFilters(activeFilters.filter(f => f.id !== id));
    };

    const handleQRScan = (decodedText: string) => {
        setIsQRScannerOpen(false);
        // Navigate to the order details page or just filter for it.
        // Assuming the QR contains the internal URL: http://localhost:3000/orders/123 or just order-123
        const orderIdMatch = decodedText.match(/\/orders\/(\d+)/);
        if (orderIdMatch) {
            router.push(decodedText);
        } else if (!isNaN(Number(decodedText))) {
            router.push(`/orders/${decodedText}`);
        } else {
            alert(`Scanned: ${decodedText}`);
        }
    };

    const clearAll = () => {
        setActiveFilters([]);
        setSearchTerm('');
        setActiveWidget(null);
        setSelectedCustomer(null);
        setShowRecurringOnly(false);
        router.push('/orders');
        setSelectedMonth((new Date().getMonth() + 1).toString());
        setSelectedYear(new Date().getFullYear().toString());
    };

    const appliedFilters = useMemo(() => {
        const obj = {
            dateFrom: "",
            dateTo: "",
            statuses: [] as string[],
            minAmount: "",
            maxAmount: "",
            searchText: "",
            customer: "",
        };
        
        activeFilters.forEach(f => {
            if (f.fieldId === 'date_range') {
                obj.dateFrom = f.value?.start || "";
                obj.dateTo = f.value?.end || "";
            }
            if (f.fieldId === 'status') {
                obj.statuses = Array.isArray(f.value) ? f.value.map(v => v.toLowerCase()) : [f.value.toLowerCase()];
            }
            if (f.fieldId === 'amount') {
                obj.minAmount = f.value?.start || "";
                obj.maxAmount = f.value?.end || "";
            }
            if (f.fieldId === 'search_text') obj.searchText = f.value;
            if (f.fieldId === 'customer_id') obj.customer = f.value;
        });
        
        return obj;
    }, [activeFilters]);

    // Combined Logic including Global Period
    const filteredOrders = useMemo(() => {
        let result = allOrders;
        if (showRecurringOnly) {
            result = result.filter((o: any) => o.is_recurring);
        }

        // Apply Global Customer Filter (High Priority)
        if (selectedCustomer) {
            result = result.filter(o => o.customer_id === selectedCustomer.id);
        }
        // Apply Global Year
        if (selectedYear !== 'All Years') {
            result = result.filter(o =>
                new Date((o.order_date || o.created_at) * 1000).getFullYear().toString() === selectedYear
            );
        }

        // Apply Global Month (if not 'all')
        if (selectedMonth !== 'all') {
            result = result.filter(o =>
                (new Date((o.order_date || o.created_at) * 1000).getMonth() + 1).toString() === selectedMonth
            );
        }

        // Apply Search Term (Top Input)
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(o => 
                o.id.toString().toLowerCase().includes(q) ||
                o.customer_name?.toLowerCase().includes(q) ||
                o.design_name?.toLowerCase().includes(q)
            );
        }

        if (appliedFilters.dateFrom) {
            result = result.filter(o =>
                new Date(o.date || o.created_at * 1000) >= new Date(appliedFilters.dateFrom)
            );
        }

        if (appliedFilters.dateTo) {
            const end = new Date(appliedFilters.dateTo);
            end.setHours(23, 59, 59, 999);
            result = result.filter(o =>
                new Date(o.date || o.created_at * 1000) <= end
            );
        }

        if (appliedFilters.statuses.length > 0) {
            result = result.filter(o =>
                appliedFilters.statuses.includes(o.status.toLowerCase())
            );
        }

        if (appliedFilters.minAmount) {
            result = result.filter(o =>
                (o.total_price || 0) >= parseFloat(appliedFilters.minAmount)
            );
        }

        if (appliedFilters.maxAmount) {
            result = result.filter(o =>
                (o.total_price || 0) <= parseFloat(appliedFilters.maxAmount)
            );
        }

        if (appliedFilters.searchText) {
            const q = appliedFilters.searchText.toLowerCase();
            result = result.filter(o =>
                o.id.toString().toLowerCase().includes(q) ||
                o.customer_name?.toLowerCase().includes(q) ||
                o.design_name?.toLowerCase().includes(q)
            );
        }

        if (appliedFilters.customer) {
            const q = appliedFilters.customer.toLowerCase();
            result = result.filter(o =>
                o.customer_name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [allOrders, appliedFilters, searchTerm, selectedYear, selectedMonth]);

    const [activeWidget, setActiveWidget] = useState<string | null>(null);

    const isProductionStatus = (status: string) => [ORDER_STATUSES.APPROVED, ORDER_STATUSES.EMBROIDERY, ORDER_STATUSES.PRINTING, ORDER_STATUSES.DYEING, ORDER_STATUSES.READY, ORDER_STATUSES.DISPATCHED].includes(status.toLowerCase());
    const isFinishedStatus = (status: string) => status.toLowerCase() === ORDER_STATUSES.DELIVERED || status.toLowerCase() === 'completed' || status.toLowerCase() === 'invoiced';

    const finalOrders = useMemo(() => {
        let result = filteredOrders;

        if (activeWidget === 'pending') {
            result = result.filter(o => o.status.toLowerCase() === ORDER_STATUSES.CREATED);
        } else if (activeWidget === 'production') {
            result = result.filter(o => isProductionStatus(o.status));
        } else if (activeWidget === 'overdue') {
            const now = Math.floor(Date.now() / 1000);
            result = result.filter(o => {
                const isFinished = isFinishedStatus(o.status);
                const deliveryDeadline = o.created_at + (7 * 24 * 60 * 60);
                return !isFinished && now > deliveryDeadline;
            });
        } else if (activeWidget === 'revenue') {
            result = [...result].sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
        }

        return result;
    }, [filteredOrders, activeWidget]);

    const stats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
        const pendingCount = filteredOrders.filter(o => o.status.toLowerCase() === ORDER_STATUSES.CREATED).length;
        const productionCount = filteredOrders.filter(o => isProductionStatus(o.status)).length;
        const now = Math.floor(Date.now() / 1000);
        const overdueCount = filteredOrders.filter(o => {
            const isFinished = isFinishedStatus(o.status);
            const deliveryDeadline = o.created_at + (7 * 24 * 60 * 60);
            return !isFinished && now > deliveryDeadline;
        }).length;

        return { totalOrders, totalRevenue, pendingCount, productionCount, overdueCount };
    }, [filteredOrders]);

    const groupedOrders = useMemo(() => {
        const groups: Record<string, { month: number; year: number; monthName: string; orders: any[]; revenue: number; pending: number; approved: number }> = {};
        
        finalOrders.forEach(o => {
            const date = new Date((o.order_date || o.created_at) * 1000);
            const y = date.getFullYear();
            const m = date.getMonth() + 1;
            const key = `${m}-${y}`;
            
            if (!groups[key]) {
                groups[key] = {
                    month: m,
                    year: y,
                    monthName: date.toLocaleString('default', { month: 'long' }),
                    orders: [],
                    revenue: 0,
                    pending: 0,
                    approved: 0
                };
            }
            
            groups[key].orders.push(o);
            groups[key].revenue += (o.total_price || 0);
            const status = o.status.toLowerCase();
            if (status === ORDER_STATUSES.CREATED) groups[key].pending++;
            else if (isProductionStatus(status)) groups[key].approved++;
        });
        
        return Object.values(groups).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [finalOrders]);

    const formatCurrency = (val: number) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
    const [paymentTerms, setPaymentTerms] = useState(7);
    const [processingInvoice, setProcessingInvoice] = useState(false);

    const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEditClick = useCallback((order: any) => {
        setSelectedOrderForEdit(order);
        setIsEditModalOpen(true);
    }, []);

    const handleGenerateInvoiceClick = useCallback((order: any) => {
        setSelectedOrderForInvoice(order);
        setPaymentTerms(7);
        setShowPaymentModal(true);
    }, []);

    const handleConfirmInvoice = async () => {
        if (!selectedOrderForInvoice) return;
        setProcessingInvoice(true);
        try {
            const res = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrderForInvoice.id, dueDays: paymentTerms }),
            });
            if (res.ok) {
                setShowPaymentModal(false);
                fetchOrders();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to generate invoice');
            }
        } catch (error) {
            console.error('Invoice generation error:', error);
            alert('Failed to generate invoice');
        } finally {
            setProcessingInvoice(false);
        }
    };

    const widgetConfig = [
        { id: 'total', label: 'Total Orders', value: stats.totalOrders, color: 'purple', icon: 'bag' },
        { id: 'revenue', label: 'Revenue Generated', value: formatCurrency(stats.totalRevenue), color: 'green', icon: 'trend' },
        { id: 'pending', label: 'Waiting Approval', value: stats.pendingCount, color: 'yellow', icon: 'clock' },
        { id: 'production', label: 'In Production', value: stats.productionCount, color: 'blue', icon: 'layers' },
        { id: 'overdue', label: 'Payment Issues', value: stats.overdueCount, color: 'red', icon: 'alert' },
    ];

    return (
        <div className={styles.ordersPage}>
            {selectedCustomer && (
                <CustomerContextHeader customer={selectedCustomer} />
            )}

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        {selectedCustomer ? `${selectedCustomer.name}'s Orders` : 'Orders'}
                    </h1>
                    <p className={styles.subtitle}>
                        {selectedCustomer 
                            ? `Managing dedicated order history and production for ${selectedCustomer.name}`
                            : 'Manage customer orders and track progress'
                        }
                    </p>
                </div>
            </div>

            {selectedCustomer && (
                <div className={styles.activeWidgetPill} style={{ marginBottom: '32px', background: 'var(--accent-bg)', borderColor: 'var(--accent)', borderWidth: '1px', borderStyle: 'solid' }}>
                    <span style={{ color: 'var(--accent)' }}>Showing Orders For: <strong>{selectedCustomer.name}</strong></span>
                    <button className={styles.closePill} onClick={clearAll} style={{ color: 'var(--accent)' }}>
                        <X size={14} />
                    </button>
                </div>
            )}
            <div className={styles.widgetRow}>
                {widgetConfig.map((w) => (
                    <StatWidget
                        key={w.id}
                        label={w.label}
                        value={w.value}
                        isSelected={activeWidget === w.id}
                        accentColor={
                            w.color === 'blue' ? '#3B82F6' :
                            w.color === 'purple' ? '#AF52DE' :
                            w.color === 'green' ? '#34C759' :
                            w.color === 'yellow' ? '#FFCC00' : '#FF3B30'
                        }
                        accentBg={
                            w.color === 'blue' ? 'rgba(59,130,246,0.12)' :
                            w.color === 'purple' ? 'rgba(175, 82, 222, 0.12)' :
                            w.color === 'green' ? 'rgba(52,199,89,0.08)' :
                            w.color === 'yellow' ? 'rgba(255,204,0,0.08)' : 'rgba(255,59,48,0.08)'
                        }
                        onClick={() => setActiveWidget(activeWidget === w.id ? null : w.id)}
                        pulse={w.id === 'overdue' && stats.overdueCount > 0}
                        badge={
                            w.id === 'pending' && stats.pendingCount > 0 ? `+${stats.pendingCount} today` :
                            w.id === 'overdue' ? 'Action needed' : '▲ 12.5%'
                        }
                        badgeType={
                            w.id === 'overdue' ? 'urgent' :
                            w.id === 'pending' ? 'neutral' : 'positive'
                        }
                        icon={
                            w.icon === 'bag' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg> :
                            w.icon === 'trend' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg> :
                            w.icon === 'clock' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> :
                            w.icon === 'layers' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> :
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                        }
                    />
                ))}
            </div>

            {activeWidget && (
                <div className={styles.activeWidgetPill}>
                    <span>Showing: <strong>{widgetConfig.find(w => w.id === activeWidget)?.label}</strong></span>
                    <button className={styles.closePill} onClick={() => setActiveWidget(null)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            )}

            <div className={styles.filterControls}>
                <div className={styles.searchWrapper}>
                    <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                    />
                </div>
                <AdvancedFilter 
                    availableFilters={availableFilters}
                    onApply={handleApplyFilters}
                    activeFilters={activeFilters}
                    resultsCount={finalOrders.length}
                    resultsLabel="orders"
                />
                
                <button 
                    onClick={() => setShowRecurringOnly(!showRecurringOnly)}
                    style={{
                        padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                        background: showRecurringOnly ? '#AF52DE' : 'var(--bg-card)', 
                        color: showRecurringOnly ? '#FFF' : 'var(--text-primary)',
                        border: showRecurringOnly ? '1px solid #AF52DE' : '1px solid var(--border-primary)',
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s'
                    }}
                >
                    <span style={{ fontSize: '16px' }}>↻</span> Recurring
                </button>
                
                <ViewingPeriodSelector
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onChangeYear={setSelectedYear}
                    onChangeMonth={setSelectedMonth}
                    years={years}
                    months={months}
                    compact={true}
                />
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button 
                        className="action-btn-secondary"
                        onClick={() => setIsQRScannerOpen(true)}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3z"></path><path d="M15 3h6v6h-6z"></path><path d="M3 15h6v6H3z"></path><path d="M15 15h6v6h-6z"></path><path d="M15 15v.01"></path><path d="M15 21v.01"></path><path d="M21 15v.01"></path><path d="M21 21v.01"></path><path d="M18 18v.01"></path></svg>
                        <span>Scan</span>
                    </button>
                    <button 
                        className="action-btn-primary"
                        onClick={() => setIsCreatePanelOpen(true)}
                    >
                        <Plus size={16} />
                        <span>Add Order</span>
                    </button>
                </div>
            </div>

            {activeFilters.length > 0 && (
                <div className={styles.activeFilters}>
                    {activeFilters.map(filter => {
                        const field = availableFilters.find(f => f.id === filter.fieldId);
                        let valueLabel = '';
                        if (Array.isArray(filter.value)) {
                            valueLabel = filter.value.map(v => field?.options?.find(o => o.value === v)?.label || v).join(', ');
                        } else if (filter.operator === 'between' || field?.type === 'dateRange') {
                            valueLabel = `${filter.value?.start || '?'} – ${filter.value?.end || '?'}`;
                        } else if (field?.type === 'select') {
                            valueLabel = field.options?.find(o => o.value === filter.value)?.label || filter.value;
                        } else { valueLabel = filter.value; }
                        return (
                            <div key={filter.id} className={styles.filterChip}>
                                <span className={styles.chipLabel}>{field?.label}:</span> {valueLabel}
                                <button onClick={() => handleRemoveFilter(filter.id)} className={styles.clearFilterBtn}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        );
                    })}
                    <button className={styles.clearAllBtn} onClick={clearAll}>Clear All</button>
                </div>
            )}

            {loading ? (
                <div className={styles.loading}>Loading orders...</div>
            ) : (
                <>
                    {finalOrders.length === 0 ? (
                        <div className={styles.emptyState}><p>No orders found</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {groupedOrders.map((group) => {
                                const key = `${group.month}-${group.year}`;
                                const currentMonthKey = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
                                const isExpanded = collapsedMonths[key] !== undefined 
                                    ? !collapsedMonths[key] 
                                    : key === currentMonthKey;

                                const metrics: any[] = [
                                    { value: group.orders.length, label: group.orders.length === 1 ? 'order' : 'orders' },
                                    { value: formatCurrency(group.revenue), label: 'revenue', type: 'success' }
                                ];

                                if (group.pending > 0) {
                                    metrics.push({ value: group.pending, label: 'waiting approval', type: 'warning' });
                                }
                                if (group.approved > 0) {
                                    metrics.push({ value: group.approved, label: 'in production', type: 'info' });
                                }

                                return (
                                    <GroupedPeriodSection
                                        key={key}
                                        monthName={group.monthName}
                                        year={group.year.toString()}
                                        metrics={metrics}
                                        isExpanded={isExpanded}
                                        onToggle={() => {
                                            setCollapsedMonths(prev => ({
                                                ...prev,
                                                [key]: prev[key] === undefined ? true : !prev[key]
                                            }));
                                        }}
                                    >
                                        <OrdersTable
                                            orders={group.orders}
                                            onUpdate={fetchOrders}
                                            onGenerateInvoice={handleGenerateInvoiceClick}
                                            onEdit={handleEditClick}
                                            activeWidget={activeWidget}
                                        />
                                    </GroupedPeriodSection>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {showPaymentModal && (
                <div className="global-modal-overlay">
                    <div className={styles.modalCard}>
                        <h3 className={styles.modalTitle}>Set Payment Terms</h3>
                        <p className={styles.modalDescription}>Invoice due date will be calculated automatically based on payment terms.</p>
                        <div className={styles.inputGroup}>
                            <label>Days until due</label>
                            <Input type="number" min="0" max="90" value={paymentTerms.toString()} onChange={(e) => setPaymentTerms(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowPaymentModal(false)} disabled={processingInvoice}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={handleConfirmInvoice} disabled={processingInvoice}>
                                {processingInvoice ? 'Generating...' : 'Generate Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreateOrderPanel 
                isOpen={isCreatePanelOpen}
                onClose={() => setIsCreatePanelOpen(false)}
                onSuccess={(orderData, sendSample) => {
                    fetchOrders();
                    if (sendSample && orderData) {
                        setChallanOrderData(orderData);
                        setIsChallanModalOpen(true);
                    }
                }}
            />
            <EditOrderModal 
                order={selectedOrderForEdit}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchOrders}
            />
            {isChallanModalOpen && (
                <GenerateChallanModal
                    isOpen={isChallanModalOpen}
                    onClose={() => {
                        setIsChallanModalOpen(false);
                        setChallanOrderData(null);
                    }}
                    orderData={challanOrderData}
                />
            )}
            <QRScannerModal 
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
                onScan={handleQRScan}
            />
        </div>
    );
}
