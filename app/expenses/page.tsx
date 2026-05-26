'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import BadgeIcon from '@/components/ui/BadgeIcon';
import ViewingPeriodSelector from '@/components/ui/ViewingPeriodSelector';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './Expenses.module.css';
import tableStyles from '@/components/ui/Table.module.css';
import { 
    Search, 
    Plus, 
    Calendar, 
    Edit2, 
    Trash2, 
    ArrowDownCircle, 
    ArrowUpCircle, 
    Calculator, 
    Users, 
    BookOpen, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';
import { getCategoryStyle } from './expenseCategoryStyles';

interface Transaction {
    id: number;
    category: string;
    amount: number;
    date: number;
    description: string;
    paymentMode: string;
    reference: string;
    customerName?: string | null;
    notes: string;
    addedBy: number | null;
    addedByName: string | null;
    isAuto: number;
    linkedId: string | null;
    created_at: number;
    type: 'in' | 'out';
}

const CASH_IN_MANUAL_CATEGORIES = [
    'Cash Sale',
    'Refund Received',
    'Other Income'
];

const CASH_IN_ALL_CATEGORIES = [
    'Invoice Payment',
    'Cash Sale',
    'Refund Received',
    'Other Income'
];

const CASH_OUT_MANUAL_CATEGORIES = [
    'Raw Material',
    'Machine Repair & Maintenance',
    'Electricity & Utilities',
    'Transport & Delivery',
    'Staff Welfare',
    'Miscellaneous'
];

const CASH_OUT_ALL_CATEGORIES = [
    'Raw Material',
    'Machine Repair & Maintenance',
    'Electricity & Utilities',
    'Transport & Delivery',
    'Staff Welfare',
    'Staff Salary',
    'Staff Advance',
    'Embroidery Work',
    'Dyeing Work',
    'Miscellaneous'
];

export default function ExpensesPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    

    // New Advanced Filters State
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [availableFilters] = useState<FilterDefinition[]>([
        { id: 'date_range', label: 'Date Range', type: 'dateRange' },
        { id: 'type', label: 'Transaction Type', type: 'select', options: [
            { value: 'in', label: 'Cash In' },
            { value: 'out', label: 'Cash Out' }
        ]},
        { id: 'category', label: 'Category', type: 'text' },
        { id: 'amount', label: 'Amount', type: 'number' },
        { id: 'search_text', label: 'Search Text', type: 'text' }
    ]);
    
    // Selected Month & Year
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

    // Stats
    const [stats, setStats] = useState({
        totalCashIn: 0,
        totalCashOut: 0,
        staffCosts: 0,
        outstandingAdvances: 0
    });

    // Modals
    const [showInModal, setShowInModal] = useState(false);
    const [showOutModal, setShowOutModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Form data
    const [inFormData, setInFormData] = useState({
        category: 'Cash Sale',
        description: '',
        amount: '',
        date: '',
        paymentMode: 'Cash',
        reference: '',
        customerName: '',
        notes: ''
    });

    const [outFormData, setOutFormData] = useState({
        category: 'Raw Material',
        description: '',
        amount: '',
        date: '',
        paymentMode: 'Cash',
        reference: '',
        notes: '',
        has_gst: false,
        supplier_gstin: '',
        invoice_no: '',
        gst_rate: '5',
        itc_claimed: false
    });

    const years = useMemo(() => {
        const ySet = new Set<string>();
        transactions.forEach(t => {
            const date = new Date(t.date * 1000);
            const y = date.getFullYear().toString();
            if (y && y !== 'NaN') ySet.add(y);
        });
        const currentYearStr = new Date().getFullYear().toString();
        ySet.add(currentYearStr);
        const sorted = Array.from(ySet).sort((a, b) => b.localeCompare(a));
        return ['All Years', ...sorted];
    }, [transactions]);

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
        fetchTransactions();
    }, [selectedYear, selectedMonth, searchTerm]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('year', selectedYear);
            params.append('month', selectedMonth);
            
            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const res = await fetch(`/api/expenses?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                
                // Normalise the transaction types (anything without "type" is "out")
                const normalized: Transaction[] = (data.expenses || []).map((item: any) => ({
                    ...item,
                    type: item.type || 'out'
                }));
                
                setTransactions(normalized);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const finalTransactions = useMemo(() => {
        let result = transactions;
        
        activeFilters.forEach(f => {
            if (f.fieldId === 'date_range') {
                if (f.value?.start) {
                    result = result.filter(t => new Date(t.date * 1000) >= new Date(f.value.start));
                }
                if (f.value?.end) {
                    const end = new Date(f.value.end);
                    end.setHours(23, 59, 59, 999);
                    result = result.filter(t => new Date(t.date * 1000) <= end);
                }
            } else if (f.fieldId === 'type' && f.value) {
                result = result.filter(t => t.type === f.value);
            } else if (f.fieldId === 'category' && f.value) {
                const q = f.value.toLowerCase();
                result = result.filter(t => t.category?.toLowerCase().includes(q));
            } else if (f.fieldId === 'amount' && f.value) {
                result = result.filter(t => t.amount === parseFloat(f.value));
            } else if (f.fieldId === 'search_text' && f.value) {
                const q = f.value.toLowerCase();
                result = result.filter(t => 
                    t.description?.toLowerCase().includes(q) ||
                    t.notes?.toLowerCase().includes(q) ||
                    t.customerName?.toLowerCase().includes(q) ||
                    t.category?.toLowerCase().includes(q)
                );
            }
        });
        
        return result;
    }, [transactions, activeFilters]);



    // Actions
    const handleAddCashIn = () => {
        setEditingTransaction(null);
        setInFormData({
            category: 'Cash Sale',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'Cash',
            reference: '',
            customerName: '',
            notes: ''
        });
        setShowInModal(true);
    };

    const handleAddCashOut = () => {
        setEditingTransaction(null);
        setOutFormData({
            category: 'Raw Material',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'Cash',
            reference: '',
            notes: '',
            has_gst: false,
            supplier_gstin: '',
            invoice_no: '',
            gst_rate: '5',
            itc_claimed: false
        });
        setShowOutModal(true);
    };

    const handleEditTransaction = (tx: Transaction) => {
        if (tx.isAuto === 1) return;
        setEditingTransaction(tx);
        
        if (tx.type === 'in') {
            setInFormData({
                category: tx.category,
                description: tx.description || '',
                amount: tx.amount.toString(),
                date: new Date(tx.date * 1000).toISOString().split('T')[0],
                paymentMode: tx.paymentMode || 'Cash',
                reference: tx.reference || '',
                customerName: tx.customerName || '',
                notes: tx.notes || ''
            });
            setShowInModal(true);
        } else {
            setOutFormData({
                category: tx.category,
                description: tx.description || '',
                amount: tx.amount.toString(),
                date: new Date(tx.date * 1000).toISOString().split('T')[0],
                paymentMode: tx.paymentMode || 'Cash',
                reference: tx.reference || '',
                notes: tx.notes || '',
                has_gst: tx.has_gst === 1,
                supplier_gstin: tx.supplier_gstin || '',
                invoice_no: tx.invoice_no || '',
                gst_rate: tx.gst_rate ? tx.gst_rate.toString() : '5',
                itc_claimed: tx.itc_claimed === 1
            });
            setShowOutModal(true);
        }
    };

    const handleSaveIn = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingTransaction ? `/api/expenses/${editingTransaction.id}` : '/api/expenses';
            const method = editingTransaction ? 'PATCH' : 'POST';

            const payload = {
                ...inFormData,
                type: 'in',
                amount: parseFloat(inFormData.amount)
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowInModal(false);
                fetchTransactions();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to save transaction');
            }
        } catch (error) {
            console.error('Save transaction error:', error);
            console.log('Failed to save transaction. Please try again.');
        }
    };

    const handleSaveOut = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingTransaction ? `/api/expenses/${editingTransaction.id}` : '/api/expenses';
            const method = editingTransaction ? 'PATCH' : 'POST';

            const payload = {
                ...outFormData,
                type: 'out',
                amount: parseFloat(outFormData.amount)
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowOutModal(false);
                fetchTransactions();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to save transaction');
            }
        } catch (error) {
            console.error('Save transaction error:', error);
            console.log('Failed to save transaction. Please try again.');
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        
        try {
            const res = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchTransactions();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to delete transaction');
            }
        } catch (error) {
            console.error('Delete transaction error:', error);
            console.log('Failed to delete transaction. Please try again.');
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatCurrency = (val: number) => {
        return `₹${Math.round(val).toLocaleString('en-IN')}`;
    };


    // Breakdown for Monthly Summary cards
    const summaryBreakdown = useMemo(() => {
        const inBreakdown = CASH_IN_ALL_CATEGORIES.map(cat => {
            const filtered = transactions.filter(t => t.type === 'in' && t.category === cat);
            const sum = filtered.reduce((total, t) => total + t.amount, 0);
            return { category: cat, sum, count: filtered.length };
        }).filter(b => b.sum > 0 || b.count > 0);

        const outBreakdown = CASH_OUT_ALL_CATEGORIES.map(cat => {
            const filtered = transactions.filter(t => t.type === 'out' && t.category === cat);
            const sum = filtered.reduce((total, t) => total + t.amount, 0);
            return { category: cat, sum, count: filtered.length };
        }).filter(b => b.sum > 0 || b.count > 0);

        return { inBreakdown, outBreakdown };
    }, [transactions]);

    const netCash = stats.totalCashIn - stats.totalCashOut;

    return (
        <div className={styles.expensesPage}>
            {/* Page Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Cash Book</h1>
                <p className={styles.subtitle}>Track all cash in and cash out</p>
            </div>

            {/* Metric Cards Grid */}
            <div className={styles.widgetRow}>
                {/* Total Cash In */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricContent}>
                        <div className={styles.metricIconBox} style={{ background: 'rgba(21, 128, 61, 0.08)', color: '#15803D' }}>
                            <ArrowDownCircle size={20} />
                        </div>
                        <div className={styles.metricDetails}>
                            <span className={styles.metricLabel}>Total Cash IN</span>
                            <span className={styles.metricValue} style={{ color: '#15803D' }}>
                                {formatCurrency(stats.totalCashIn)}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Total Cash Out */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricContent}>
                        <div className={styles.metricIconBox} style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#DC2626' }}>
                            <ArrowUpCircle size={20} />
                        </div>
                        <div className={styles.metricDetails}>
                            <span className={styles.metricLabel}>Total Cash OUT</span>
                            <span className={styles.metricValue} style={{ color: '#DC2626' }}>
                                {formatCurrency(stats.totalCashOut)}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Net Cash */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricContent}>
                        <div className={styles.metricIconBox} style={{ background: 'rgba(0, 113, 227, 0.08)', color: '#0071E3' }}>
                            <Calculator size={20} />
                        </div>
                        <div className={styles.metricDetails}>
                            <span className={styles.metricLabel}>Net cash this month</span>
                            <span className={styles.metricValue} style={{ color: netCash >= 0 ? '#15803D' : '#DC2626' }}>
                                {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Staff Costs */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricContent}>
                        <div className={styles.metricIconBox} style={{ background: 'rgba(255, 149, 0, 0.08)', color: '#FF9500' }}>
                            <Users size={20} />
                        </div>
                        <div className={styles.metricDetails}>
                            <span className={styles.metricLabel}>Staff costs this month</span>
                            <span className={styles.metricValue} style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(stats.staffCosts)}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Controls Row */}
            <div className={styles.controls} style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ width: '260px' }}>
                    <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>

                <AdvancedFilter 
                    availableFilters={availableFilters}
                    onApply={(filters) => setActiveFilters(filters)}
                    activeFilters={activeFilters}
                    resultsCount={finalTransactions.length}
                    resultsLabel="transactions"
                />

                {/* Viewing Period Selector */}
                <ViewingPeriodSelector
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onChangeYear={setSelectedYear}
                    onChangeMonth={setSelectedMonth}
                    years={years}
                    months={months}
                    compact={true}
                />

                {/* Add Cash In / Add Cash Out Buttons */}
                {user?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                        <button 
                            onClick={handleAddCashIn}
                            className="action-btn-success"
                        >
                            <Plus size={16} />
                            <span>Cash In</span>
                        </button>
                        <button 
                            onClick={handleAddCashOut}
                            className="action-btn-danger"
                        >
                            <Plus size={16} />
                            <span>Cash Out</span>
                        </button>
                    </div>
                )}
            </div>



            {/* Transaction Table */}
            {loading ? (
                <div className={styles.loading}>Loading transactions...</div>
            ) : finalTransactions.length === 0 ? (
                <div className={tableStyles.tableContainer} style={{ marginTop: '20px' }}>
                    <div className={tableStyles.emptyState} style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className={tableStyles.emptyIcon} style={{ marginBottom: '12px' }}>
                            <BookOpen size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
                        </div>
                        <h3 className={tableStyles.emptyTitle} style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>No transactions yet</h3>
                        <p className={tableStyles.emptyText} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add your first cash in or cash out entry</p>
                    </div>
                </div>
            ) : (
                <div className={tableStyles.tableContainer} style={{ marginTop: '20px' }}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th} style={{ width: '12%' }}>Date</th>
                                <th className={tableStyles.th} style={{ width: '10%' }}>Type</th>
                                <th className={tableStyles.th} style={{ width: '18%' }}>Category</th>
                                <th className={tableStyles.th} style={{ width: '25%' }}>Description</th>
                                <th className={tableStyles.th} style={{ width: '15%' }}>Amount</th>
                                <th className={tableStyles.th} style={{ width: '12%' }}>Payment mode</th>
                                <th className={tableStyles.th} style={{ width: '12%' }}>Added by</th>
                                {user?.role === 'admin' && <th className={tableStyles.th} style={{ width: '10%', textAlign: 'center' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {finalTransactions.map((tx) => {
                                const categoryStyle = getCategoryStyle(tx.category);
                                const isCashIn = tx.type === 'in';
                                const BadgeIcon = categoryStyle.icon;

                                return (
                                    <tr key={tx.id} className={tableStyles.tr}>
                                        <td className={tableStyles.td} style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                            {formatDate(tx.date)}
                                        </td>
                                        <td className={tableStyles.td}>
                                            <span 
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    background: isCashIn ? '#F0FDF4' : '#FEF2F2',
                                                    color: isCashIn ? '#15803D' : '#DC2626'
                                                }}
                                            >
                                                {isCashIn ? 'IN' : 'OUT'}
                                            </span>
                                        </td>
                                        <td className={tableStyles.td}>
                                            <span 
                                                className={styles.badge}
                                                style={{
                                                    background: categoryStyle.bg,
                                                    color: categoryStyle.text,
                                                    borderColor: categoryStyle.border
                                                }}
                                            >
                                                <BadgeIcon size={10} />
                                                <span>{categoryStyle.label}</span>
                                            </span>
                                        </td>
                                        <td className={tableStyles.td} style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{tx.description || '—'}</span>
                                                {tx.customerName && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        Client: {tx.customerName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableStyles.td} style={{ fontSize: '14px', fontWeight: '600', color: isCashIn ? '#15803D' : '#DC2626' }}>
                                            {isCashIn ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={tableStyles.td} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <span title={tx.reference ? `Ref: ${tx.reference}` : undefined}>
                                                {tx.paymentMode || 'Cash'}
                                            </span>
                                        </td>
                                        <td className={tableStyles.td} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {tx.isAuto === 1 ? 'System' : (tx.addedByName || 'Admin')}
                                        </td>
                                        {user?.role === 'admin' && (
                                            <td className={tableStyles.td}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    {tx.isAuto === 1 ? (
                                                        <span className={styles.actionButtonBadge}>
                                                            Auto
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="small"
                                                                onClick={() => handleEditTransaction(tx)}
                                                                style={{ padding: '4px 8px', minWidth: '0' }}
                                                            >
                                                                <Edit2 size={13} />
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                size="small"
                                                                onClick={() => handleDeleteTransaction(tx.id)}
                                                                style={{ padding: '4px 8px', minWidth: '0' }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Monthly Summary Section */}
            <div style={{ marginTop: '36px' }}>
                <h2 className={styles.summaryHeader}>Monthly Summary</h2>
                
                <div className={styles.grid2Col} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {/* Cash In Breakdown */}
                    <Card style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#15803D', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px', marginBottom: '16px' }}>
                            Cash IN Breakdown
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaryBreakdown.inBreakdown.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No income entries for this month</p>
                            ) : (
                                summaryBreakdown.inBreakdown.map(b => (
                                    <div key={b.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#15803D' }} />
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{b.category}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#15803D' }}>{formatCurrency(b.sum)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-secondary)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px', color: '#15803D' }}>
                            <span>Total Cash IN</span>
                            <span>{formatCurrency(stats.totalCashIn)}</span>
                        </div>
                    </Card>

                    {/* Cash Out Breakdown */}
                    <Card style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#DC2626', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px', marginBottom: '16px' }}>
                            Cash OUT Breakdown
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaryBreakdown.outBreakdown.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No expense entries for this month</p>
                            ) : (
                                summaryBreakdown.outBreakdown.map(b => (
                                    <div key={b.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} />
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{b.category}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>{formatCurrency(b.sum)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-secondary)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px', color: '#DC2626' }}>
                            <span>Total Cash OUT</span>
                            <span>{formatCurrency(stats.totalCashOut)}</span>
                        </div>
                    </Card>
                </div>

                {/* Net Summary Row */}
                <Card style={{ marginTop: '20px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>Net Cash this month</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: netCash >= 0 ? '#15803D' : '#DC2626' }}>
                        {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
                    </span>
                </Card>
            </div>

            {/* CASH IN MODAL */}
            <Modal
                isOpen={showInModal}
                onClose={() => setShowInModal(false)}
                title={editingTransaction ? 'Modify Cash In Entry' : 'Add Cash In'}
            >
                <form onSubmit={handleSaveIn}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Category
                            </label>
                            <select
                                value={inFormData.category}
                                onChange={(e) => setInFormData({ ...inFormData, category: e.target.value })}
                                required
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                            >
                                {CASH_IN_MANUAL_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {getCategoryStyle(cat).label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label="Description"
                            type="text"
                            placeholder="e.g. Direct sale to walk-in customer"
                            value={inFormData.description}
                            onChange={(e) => setInFormData({ ...inFormData, description: e.target.value })}
                            required
                        />

                        <Input
                            label="Amount ₹"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Enter incoming amount..."
                            value={inFormData.amount}
                            onChange={(e) => setInFormData({ ...inFormData, amount: e.target.value })}
                            required
                        />

                        <Input
                            label="Date"
                            type="date"
                            value={inFormData.date}
                            onChange={(e) => setInFormData({ ...inFormData, date: e.target.value })}
                            required
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Payment mode
                                </label>
                                <select
                                    value={inFormData.paymentMode}
                                    onChange={(e) => setInFormData({ ...inFormData, paymentMode: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="NEFT">NEFT</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>

                            <Input
                                label="Reference / UTR number (Optional)"
                                type="text"
                                placeholder="Tx ID / UTR..."
                                value={inFormData.reference}
                                onChange={(e) => setInFormData({ ...inFormData, reference: e.target.value })}
                            />
                        </div>

                        <Input
                            label="Customer name (Optional)"
                            type="text"
                            placeholder="Walk-in Customer / Client Name..."
                            value={inFormData.customerName}
                            onChange={(e) => setInFormData({ ...inFormData, customerName: e.target.value })}
                        />

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                value={inFormData.notes}
                                onChange={(e) => setInFormData({ ...inFormData, notes: e.target.value })}
                                placeholder="Enter additional context..."
                                rows={3}
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                        <Button variant="ghost" type="button" onClick={() => setShowInModal(false)}>
                            Cancel
                        </Button>
                        <Button style={{ background: '#15803D', color: '#ffffff', borderColor: '#15803D' }} type="submit">
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* CASH OUT MODAL */}
            <Modal
                isOpen={showOutModal}
                onClose={() => setShowOutModal(false)}
                title={editingTransaction ? 'Modify Cash Out Entry' : 'Add Cash Out'}
            >
                <form onSubmit={handleSaveOut}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Category
                            </label>
                            <select
                                value={outFormData.category}
                                onChange={(e) => setOutFormData({ ...outFormData, category: e.target.value })}
                                required
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                            >
                                {CASH_OUT_MANUAL_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {getCategoryStyle(cat).label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label="Description"
                            type="text"
                            placeholder="Briefly describe the transaction..."
                            value={outFormData.description}
                            onChange={(e) => setOutFormData({ ...outFormData, description: e.target.value })}
                            required
                        />

                        <Input
                            label="Amount Paid (₹)"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Enter transaction value..."
                            value={outFormData.amount}
                            onChange={(e) => setOutFormData({ ...outFormData, amount: e.target.value })}
                            required
                        />

                        <Input
                            label="Date"
                            type="date"
                            value={outFormData.date}
                            onChange={(e) => setOutFormData({ ...outFormData, date: e.target.value })}
                            required
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Payment mode
                                </label>
                                <select
                                    value={outFormData.paymentMode}
                                    onChange={(e) => setOutFormData({ ...outFormData, paymentMode: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="NEFT">NEFT</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>

                            <Input
                                label="Reference / UTR number (Optional)"
                                type="text"
                                placeholder="Tx ID / UTR..."
                                value={outFormData.reference}
                                onChange={(e) => setOutFormData({ ...outFormData, reference: e.target.value })}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                value={outFormData.notes}
                                onChange={(e) => setOutFormData({ ...outFormData, notes: e.target.value })}
                                placeholder="Enter additional details or context..."
                                rows={3}
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </div>
                        
                        {/* GST DETAILS SECTION */}
                        <div style={{ padding: '16px', border: '1px solid var(--border-primary)', borderRadius: '8px', background: 'var(--bg-card)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', marginBottom: outFormData.has_gst ? '16px' : '0' }}>
                                <input
                                    type="checkbox"
                                    checked={outFormData.has_gst}
                                    onChange={(e) => setOutFormData({ ...outFormData, has_gst: e.target.checked })}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
                                />
                                This purchase includes GST / Tax Invoice
                            </label>

                            {outFormData.has_gst && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <Input
                                        label="Supplier GSTIN"
                                        type="text"
                                        placeholder="24AAAAA0000A1Z5"
                                        value={outFormData.supplier_gstin}
                                        onChange={(e) => setOutFormData({ ...outFormData, supplier_gstin: e.target.value.toUpperCase() })}
                                        required={outFormData.has_gst}
                                    />
                                    <Input
                                        label="Invoice / Bill Number"
                                        type="text"
                                        placeholder="INV-1234"
                                        value={outFormData.invoice_no}
                                        onChange={(e) => setOutFormData({ ...outFormData, invoice_no: e.target.value })}
                                        required={outFormData.has_gst}
                                    />
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                            GST Rate
                                        </label>
                                        <select
                                            value={outFormData.gst_rate}
                                            onChange={(e) => setOutFormData({ ...outFormData, gst_rate: e.target.value })}
                                            required={outFormData.has_gst}
                                            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                                        >
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={outFormData.itc_claimed}
                                                onChange={(e) => setOutFormData({ ...outFormData, itc_claimed: e.target.checked })}
                                                style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
                                            />
                                            Claim Input Tax Credit (ITC)
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                        <Button variant="ghost" type="button" onClick={() => setShowOutModal(false)}>
                            Cancel
                        </Button>
                        <Button style={{ background: '#ffffff', color: '#DC2626', borderColor: '#DC2626', borderWidth: '1px', borderStyle: 'solid' }} type="submit">
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
