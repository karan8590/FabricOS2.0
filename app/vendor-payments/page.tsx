'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './VendorPayments.module.css';
import tableStyles from '@/components/ui/Table.module.css';
import { 
    Clock, 
    AlertCircle, 
    Calendar, 
    Check, 
    Search, 
    Plus, 
    MoreVertical, 
    Edit, 
    Eye, 
    History,
    IndianRupee,
    Loader2,
    SlidersHorizontal,
    Layers,
    Grid,
    ChevronDown
} from 'lucide-react';
import StatWidget from '@/components/ui/StatWidget';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import Input from '@/components/ui/Input';

interface Instalment {
    id: number;
    vendor_payment_id: number;
    date: string;
    amount: number;
    payment_mode: string;
    reference: string;
    notes: string;
}

interface VendorPayment {
    id: number;
    vendor_id: number;
    vendor_name: string;
    vendor_phone: string;
    order_id: number | null;
    order_number: string | null;
    work_type: 'embroidery' | 'dyeing';
    total_amount: number;
    amount_paid: number;
    balance: number;
    due_date: string;
    status: 'paid' | 'partial' | 'unpaid' | 'overdue';
    linked_job_cost_id: number | null;
    created_at: number;
    instalments: Instalment[];
}

interface Vendor {
    id: number;
    name: string;
    contact: string;
}

export default function VendorPaymentsPage() {
    const [payments, setPayments] = useState<VendorPayment[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [stats, setStats] = useState({
        totalOutstanding: 0,
        totalOverdue: 0,
        totalDueThisWeek: 0,
        totalPaidThisMonth: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All'); // All | Overdue | Due this week | Unpaid | Partial | Paid
    const [activeWidget, setActiveWidget] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('due_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Collapsible Groups State
    const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

    // Action Menu Popover
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    // Modals visibility
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);

    // Vendor audit logs
    const [vendorAuditLogs, setVendorAuditLogs] = useState<any[]>([]);
    const [vendorAuditLoading, setVendorAuditLoading] = useState(false);

    // Selected payment for actions
    const [selectedPayment, setSelectedPayment] = useState<VendorPayment | null>(null);

    // Pay Vendor Form State
    const [payingAmount, setPayingAmount] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    // Add Manual Due Form State
    const [manualVendorId, setManualVendorId] = useState('');
    const [manualWorkType, setManualWorkType] = useState<'embroidery' | 'dyeing'>('embroidery');
    const [manualAmount, setManualAmount] = useState<number>(0);
    const [manualDueDate, setManualDueDate] = useState('');
    const [manualNotes, setManualNotes] = useState('');
    const [savingManual, setSavingManual] = useState(false);

    // Edit Due Date Form State
    const [editDueDateVal, setEditDueDateVal] = useState('');
    const [savingDueDate, setSavingDueDate] = useState(false);

    // Fetch Payments and Stats
    const fetchPaymentsData = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                search: searchQuery,
                filter: activeFilter
            });
            const res = await fetch(`/api/vendor-payments?${queryParams}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
                setStats(data.stats || {
                    totalOutstanding: 0,
                    totalOverdue: 0,
                    totalDueThisWeek: 0,
                    totalPaidThisMonth: 0
                });
            }
        } catch (err) {
            console.error('Fetch vendor payments data error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Vendors list for Manual Creation
    const fetchVendorsList = async () => {
        try {
            const res = await fetch('/api/vendors');
            if (res.ok) {
                const data = await res.json();
                setVendors(data.vendors || []);
            }
        } catch (err) {
            console.error('Fetch vendors error:', err);
        }
    };

    useEffect(() => {
        fetchPaymentsData();
    }, [searchQuery, activeFilter]);

    useEffect(() => {
        fetchVendorsList();
    }, []);

    // Format money as Indian Rupees
    const formatCurrency = (val: number) => {
        return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Helper: Due Date split styling and relative timing Left
    const getDaysRemaining = (dueDateStr: string, status: string) => {
        if (status === 'paid') return { text: 'Paid', color: '#34C759', bold: false };
        if (!dueDateStr) return { text: '-', color: 'var(--text-tertiary)', bold: false };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDateStr);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            const overdueDays = Math.abs(diffDays);
            return { 
                text: `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`, 
                color: '#FF3B30', 
                bold: true 
            };
        } else if (diffDays === 0) {
            return { text: 'Due Today', color: '#FF9500', bold: true };
        } else if (diffDays <= 3) {
            return { text: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`, color: '#FF9500', bold: false };
        } else {
            return { text: `${diffDays} days left`, color: 'var(--text-secondary)', bold: false };
        }
    };

    const formatDueDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Trigger Paying Modal
    const openPayModal = async (payment: VendorPayment) => {
        setSelectedPayment(payment);
        setPayingAmount(payment.balance);
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMode('Cash');
        setPaymentReference('');
        setPaymentNotes('');
        setIsPayModalOpen(true);
        setActiveMenuId(null);

        // Fetch audit logs for this vendor payment
        setVendorAuditLoading(true);
        try {
            const res = await fetch(`/api/audit-logs/entity?entity=vendor_payment&entityId=${payment.id}`);
            if (res.ok) {
                const data = await res.json();
                setVendorAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Fetch vendor audit logs error:', err);
        } finally {
            setVendorAuditLoading(false);
        }
    };

    // Submit Pay Vendor instalment
    const handlePaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayment || payingAmount <= 0) return;

        if (payingAmount > selectedPayment.balance) {
            alert(`Amount paying cannot exceed outstanding balance of ₹${selectedPayment.balance}`);
            return;
        }

        try {
            setProcessingPayment(true);
            const res = await fetch(`/api/vendor-payments/${selectedPayment.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: payingAmount,
                    payment_date: paymentDate,
                    payment_mode: paymentMode,
                    reference: paymentReference,
                    notes: paymentNotes
                })
            });

            if (res.ok) {
                alert(`Payment of ₹${payingAmount.toLocaleString('en-IN')} successfully recorded!`);
                setIsPayModalOpen(false);
                fetchPaymentsData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to record vendor payment.');
            }
        } catch (err) {
            console.error('Submit payment error:', err);
            alert('An unexpected network error occurred.');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Submit Manual Outstanding Payment
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualVendorId || manualAmount <= 0 || !manualDueDate) {
            alert('Please select a vendor, enter a valid amount, and select a due date.');
            return;
        }

        try {
            setSavingManual(true);
            const res = await fetch('/api/vendor-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_id: parseInt(manualVendorId),
                    work_type: manualWorkType,
                    total_amount: manualAmount,
                    due_date: manualDueDate,
                    notes: manualNotes
                })
            });

            if (res.ok) {
                alert('Outstanding vendor payment successfully registered! ✓');
                setIsManualModalOpen(false);
                // Clear state
                setManualVendorId('');
                setManualAmount(0);
                setManualDueDate('');
                setManualNotes('');
                fetchPaymentsData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to register manual payment.');
            }
        } catch (err) {
            console.error('Manual submit error:', err);
            alert('Unexpected error saving outstanding payment.');
        } finally {
            setSavingManual(false);
        }
    };

    // Trigger Edit Due Date Modal
    const openEditDateModal = (payment: VendorPayment) => {
        setSelectedPayment(payment);
        setEditDueDateVal(payment.due_date);
        setIsEditDateModalOpen(true);
        setActiveMenuId(null);
    };

    // Submit edited due date
    const handleEditDateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayment || !editDueDateVal) return;

        try {
            setSavingDueDate(true);
            const res = await fetch(`/api/vendor-payments/${selectedPayment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ due_date: editDueDateVal })
            });

            if (res.ok) {
                alert('Due date successfully updated!');
                setIsEditDateModalOpen(false);
                fetchPaymentsData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save new due date.');
            }
        } catch (err) {
            console.error('Submit due date error:', err);
            alert('Failed to update due date due to network error.');
        } finally {
            setSavingDueDate(false);
        }
    };

    // Table sorting logic
    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return <svg className={styles.sortIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5" /></svg>;
        }
        return sortOrder === 'asc' ? (
            <svg className={styles.sortIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 14l5-5 5 5" /></svg>
        ) : (
            <svg className={styles.sortIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5" /></svg>
        );
    };

    // Interactive Widget Filters & Main Filters logic
    const filteredPayments = useMemo(() => {
        let result = [...payments];

        if (activeWidget === 'total') {
            result = result.filter(p => p.balance > 0);
        } else if (activeWidget === 'overdue') {
            result = result.filter(p => p.status === 'overdue');
        } else if (activeWidget === 'due_week') {
            result = result.filter(p => {
                if (p.status === 'paid') return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(p.due_date);
                due.setHours(0, 0, 0, 0);
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
            });
        } else if (activeWidget === 'paid_month') {
            result = result.filter(p => p.status === 'paid');
        }

        return result;
    }, [payments, activeWidget]);

    const sortedPayments = useMemo(() => {
        return [...filteredPayments].sort((a, b) => {
            let valA = a[sortBy as keyof typeof a];
            let valB = b[sortBy as keyof typeof b];

            if (sortBy === 'total_amount' || sortBy === 'balance' || sortBy === 'amount_paid') {
                return sortOrder === 'asc' 
                    ? (valA as number) - (valB as number) 
                    : (valB as number) - (valA as number);
            }

            if (sortBy === 'due_date') {
                return sortOrder === 'asc'
                    ? new Date(valA as string).getTime() - new Date(valB as string).getTime()
                    : new Date(valB as string).getTime() - new Date(valA as string).getTime();
            }

            if (sortBy === 'vendor_name') {
                return sortOrder === 'asc'
                    ? (valA as string).localeCompare(valB as string)
                    : (valB as string).localeCompare(valA as string);
            }

            return 0;
        });
    }, [filteredPayments, sortBy, sortOrder]);

    // Grouping by Vendor Name collapsible sections
    const groupedSections = useMemo(() => {
        const groups: Record<string, {
            vendorId: number;
            vendorName: string;
            vendorPhone: string;
            payments: VendorPayment[];
            stats: {
                count: number;
                totalAmount: number;
                amountPaid: number;
                balance: number;
                overdueCount: number;
            };
        }> = {};

        sortedPayments.forEach(p => {
            const key = p.vendor_name;
            if (!groups[key]) {
                groups[key] = {
                    vendorId: p.vendor_id,
                    vendorName: p.vendor_name,
                    vendorPhone: p.vendor_phone,
                    payments: [],
                    stats: { count: 0, totalAmount: 0, amountPaid: 0, balance: 0, overdueCount: 0 }
                };
            }

            groups[key].payments.push(p);
            groups[key].stats.count += 1;
            groups[key].stats.totalAmount += p.total_amount;
            groups[key].stats.amountPaid += p.amount_paid;
            groups[key].stats.balance += p.balance;
            if (p.status === 'overdue') {
                groups[key].stats.overdueCount += 1;
            }
        });

        return Object.values(groups).sort((a, b) => b.stats.balance - a.stats.balance);
    }, [sortedPayments]);

    // Initialize all expanded by default
    useEffect(() => {
        if (groupedSections.length > 0 && Object.keys(expandedVendors).length === 0) {
            const initial: Record<string, boolean> = {};
            groupedSections.forEach(g => {
                initial[g.vendorName] = true;
            });
            setExpandedVendors(initial);
        }
    }, [groupedSections]);

    const toggleVendor = (vendorName: string) => {
        setExpandedVendors(prev => ({
            ...prev,
            [vendorName]: !prev[vendorName]
        }));
    };

    // Sub-text values counts
    const unpaidVendorsCount = useMemo(() => {
        return new Set(payments.filter(p => p.balance > 0).map(p => p.vendor_id)).size;
    }, [payments]);

    const overdueDuesCount = useMemo(() => {
        return payments.filter(p => p.status === 'overdue').length;
    }, [payments]);

    const dueThisWeekCount = useMemo(() => {
        return payments.filter(p => {
            if (p.status === 'paid') return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(p.due_date);
            due.setHours(0, 0, 0, 0);
            const diffTime = due.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
        }).length;
    }, [payments]);

    const completedPaymentsCount = useMemo(() => {
        return payments.filter(p => p.status === 'paid').length;
    }, [payments]);

    // Master Table Render function
    const renderTable = (list: VendorPayment[]) => {
        return (
            <table className={styles.table}>
                <thead className={styles.thead}>
                    <tr>
                        <th className={styles.th} onClick={() => handleSort('vendor_name')}>
                            <div className={styles.flexGap}>
                                Vendor {getSortIcon('vendor_name')}
                            </div>
                        </th>
                        <th className={styles.th}>Order</th>
                        <th className={styles.th}>Work Type</th>
                        <th className={`${styles.th} ${styles.sortable}`} onClick={() => handleSort('total_amount')} style={{ textAlign: 'right' }}>
                            <div className={styles.flexGap} style={{ justifyContent: 'flex-end' }}>
                                Amount {getSortIcon('total_amount')}
                            </div>
                        </th>
                        <th className={styles.th}>Payment Progress</th>
                        <th className={`${styles.th} ${styles.sortable}`} onClick={() => handleSort('balance')} style={{ textAlign: 'right' }}>
                            <div className={styles.flexGap} style={{ justifyContent: 'flex-end' }}>
                                Balance {getSortIcon('balance')}
                            </div>
                        </th>
                        <th className={`${styles.th} ${styles.sortable}`} onClick={() => handleSort('due_date')}>
                            <div className={styles.flexGap}>
                                Due Date {getSortIcon('due_date')}
                            </div>
                        </th>
                        <th className={styles.th}>Status</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody className={tableStyles.tbody}>
                    {list.map((p) => {
                        const daysInfo = getDaysRemaining(p.due_date, p.status);
                        const progressPercent = Math.min(100, Math.max(0, (p.amount_paid / p.total_amount) * 100));
                        return (
                            <tr key={p.id} className={styles.tr}>
                                {/* VENDOR */}
                                <td className={styles.td}>
                                    <div className={styles.vendorCol}>
                                        <span className={styles.vendorName}>{p.vendor_name}</span>
                                        <span className={styles.vendorPhone}>{p.vendor_phone || 'No phone'}</span>
                                    </div>
                                </td>

                                {/* ORDER */}
                                <td className={styles.td}>
                                    {p.order_id ? (
                                        <Link href={`/orders/${p.order_id}`} className={styles.orderLink}>
                                            #{p.order_number || p.order_id}
                                        </Link>
                                    ) : (
                                        <span className={styles.manualBadge}>Manual</span>
                                    )}
                                </td>

                                {/* WORK TYPE */}
                                <td className={styles.td}>
                                    <span className={p.work_type === 'embroidery' ? styles.embroideryBadge : styles.dyeingBadge}>
                                        {p.work_type === 'embroidery' ? 'Embroidery' : 'Dyeing'}
                                    </span>
                                </td>

                                {/* AMOUNT */}
                                <td className={`${styles.td} ${styles.amount}`} style={{ textAlign: 'right' }}>
                                    {formatCurrency(p.total_amount)}
                                </td>

                                {/* PAYMENT PROGRESS */}
                                <td className={styles.td}>
                                    <div className={styles.progressContainer}>
                                        <div className={styles.progressText}>
                                            <span>{formatCurrency(p.amount_paid)} paid</span>
                                            <span className={styles.progressTotal}>/ {formatCurrency(p.total_amount)}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div 
                                                className={styles.progressFill} 
                                                style={{ 
                                                    width: `${progressPercent}%`,
                                                    backgroundColor: '#16A34A'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </td>

                                {/* BALANCE */}
                                <td className={styles.td} style={{ textAlign: 'right', fontWeight: '600', color: p.balance > 0 ? '#FF3B30' : 'var(--text-disabled)' }}>
                                    {p.balance > 0 ? formatCurrency(p.balance) : '—'}
                                </td>

                                {/* DUE DATE */}
                                <td className={styles.td}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{formatDueDate(p.due_date)}</span>
                                        <span style={{ fontSize: '11.5px', fontWeight: daysInfo.bold ? '600' : '500', color: daysInfo.color }}>
                                            {daysInfo.text}
                                        </span>
                                    </div>
                                </td>

                                {/* STATUS */}
                                <td className={styles.td}>
                                    <Badge status={p.status} />
                                </td>

                                {/* ACTIONS */}
                                <td className={styles.td} style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {p.status !== 'paid' && (
                                            <Button 
                                                variant="ghost" 
                                                size="small"
                                                onClick={() => openPayModal(p)}
                                                style={{ color: '#0071E3', fontWeight: '600' }}
                                            >
                                                Pay
                                            </Button>
                                        )}

                                        {p.instalments && p.instalments.length > 0 && (
                                            <Button 
                                                variant="ghost" 
                                                size="small"
                                                onClick={() => openPayModal(p)}
                                                title="View receipt / instalment history"
                                                style={{ color: 'var(--text-secondary)', padding: '4px 6px' }}
                                            >
                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                            </Button>
                                        )}

                                        {/* Action dropdown */}
                                        <div className={styles.menuContainer}>
                                            <button 
                                                className={styles.menuTrigger}
                                                onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {activeMenuId === p.id && (
                                                <div className={styles.menuDropdown}>
                                                    <button 
                                                        className={styles.menuItem}
                                                        onClick={() => openEditDateModal(p)}
                                                    >
                                                        <Edit size={13} />
                                                        Edit due date
                                                    </button>
                                                    {p.order_id && (
                                                        <Link href={`/orders/${p.order_id}`} className={styles.menuItem} style={{ textDecoration: 'none' }}>
                                                            <Eye size={13} />
                                                            View order
                                                        </Link>
                                                    )}
                                                    {p.instalments && p.instalments.length > 0 && (
                                                        <button 
                                                            className={styles.menuItem}
                                                            onClick={() => openPayModal(p)}
                                                        >
                                                            <History size={13} />
                                                            Payment history
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <div className={styles.container}>
            {/* Page Header */}
            <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className={styles.title}>Vendor Payments</h1>
                    <p className={styles.subtitle}>Track and manage outsourced job work payments (Accounts Payable)</p>
                </div>
                <button 
                    className="action-btn-primary"
                    onClick={() => {
                        setManualDueDate(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
                        setIsManualModalOpen(true);
                    }}
                >
                    <Plus size={16} />
                    <span>Add Payment Due</span>
                </button>
            </div>

            {/* Premium Stat Cards with Widgets matching Invoices */}
            <div className={styles.statsRow}>
                <StatWidget
                    label="Total Outstanding"
                    value={formatCurrency(stats.totalOutstanding)}
                    secondaryText={`${unpaidVendorsCount} ${unpaidVendorsCount === 1 ? 'vendor' : 'vendors'} unpaid`}
                    isSelected={activeWidget === 'total'}
                    onClick={() => setActiveWidget(activeWidget === 'total' ? null : 'total')}
                    accentColor="#0071E3"
                    icon={<Clock />}
                    sublabel="Click to filter unpaid"
                />

                <StatWidget
                    label="Overdue Balance"
                    value={formatCurrency(stats.totalOverdue)}
                    secondaryText={overdueDuesCount > 0 ? "Action needed" : "All clear"}
                    badge={overdueDuesCount > 0 ? "Overdue" : "On track"}
                    badgeType={overdueDuesCount > 0 ? "urgent" : "positive"}
                    pulse={overdueDuesCount > 0}
                    isSelected={activeWidget === 'overdue'}
                    onClick={() => setActiveWidget(activeWidget === 'overdue' ? null : 'overdue')}
                    accentColor="#FF3B30"
                    icon={<AlertCircle />}
                    sublabel="Click to filter overdue"
                />

                <StatWidget
                    label="Due This Week"
                    value={formatCurrency(stats.totalDueThisWeek)}
                    secondaryText={`${dueThisWeekCount} ${dueThisWeekCount === 1 ? 'payment' : 'payments'} due`}
                    isSelected={activeWidget === 'due_week'}
                    onClick={() => setActiveWidget(activeWidget === 'due_week' ? null : 'due_week')}
                    accentColor="#FF9500"
                    icon={<Calendar />}
                    sublabel="Click to filter this week"
                />

                <StatWidget
                    label="Paid This Month"
                    value={formatCurrency(stats.totalPaidThisMonth)}
                    secondaryText={`${completedPaymentsCount} ${completedPaymentsCount === 1 ? 'payment' : 'payments'} fully paid`}
                    isSelected={activeWidget === 'paid_month'}
                    onClick={() => setActiveWidget(activeWidget === 'paid_month' ? null : 'paid_month')}
                    accentColor="#34C759"
                    icon={<Check />}
                    sublabel="Click to filter paid"
                />
            </div>

            {/* Active Widget Filter Badge */}
            {activeWidget && (
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--bg-grouped)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    marginBottom: '24px',
                    animation: 'fadeIn 0.2s ease-out',
                    border: '1px solid var(--border-primary)'
                }}>
                    <span>Viewing <strong>{
                        activeWidget === 'total' ? 'Unpaid Outstanding' :
                        activeWidget === 'overdue' ? 'Overdue Payments' :
                        activeWidget === 'due_week' ? 'Due This Week' :
                        'Paid Payments'
                    }</strong></span>
                    <button 
                        onClick={() => setActiveWidget(null)} 
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            marginLeft: '4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                        <SlidersHorizontal size={12} />
                    </button>
                </div>
            )}

            {/* Controls Bar (Search, view mode toggle etc) */}
            <div className={styles.controls}>
                <div className={styles.leftControls}>
                    <div className={styles.searchWrapper}>
                        <Input
                            placeholder="Search by vendor or order..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search size={16} />}
                        />
                    </div>

                    <button className={styles.filterToggleBtn} onClick={() => {
                        // Resets widget filter if any
                        setActiveWidget(null);
                    }}>
                        <SlidersHorizontal size={15} />
                        <span>Filter</span>
                    </button>
                </div>

            </div>

            {/* Filter Pills matching quickMonthTabs */}
            <div className={styles.quickMonthTabs}>
                {['All', 'Overdue', 'Due this week', 'Unpaid', 'Partial', 'Paid'].map((f) => (
                    <button
                        key={f}
                        className={`${styles.quickMonthTab} ${activeFilter === f ? styles.quickMonthTabActive : ''}`}
                        onClick={() => {
                            setActiveFilter(f);
                            setActiveWidget(null); // Clear card filters on tab changes
                        }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Loading vendor payments ledger...</span>
                </div>
            ) : sortedPayments.length === 0 ? (
                <div className={styles.tableCard} style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)' }}>
                    No outstanding payments match your current criteria.
                </div>
            ) : viewMode === 'flat' ? (
                <div className={styles.tableCard}>
                    {renderTable(sortedPayments)}
                </div>
            ) : (
                <div className={styles.groupedContainer}>
                    {groupedSections.map((g) => (
                        <div key={g.vendorName} className={styles.monthGroup}>
                            {/* Vendor collapsible Header */}
                            <div className={styles.monthGroupHeader} onClick={() => toggleVendor(g.vendorName)}>
                                <div className={styles.monthGroupTitleGroup}>
                                    <ChevronDown 
                                        size={16} 
                                        className={`${styles.collapseArrow} ${expandedVendors[g.vendorName] ? styles.collapseArrowExpanded : ''}`} 
                                    />
                                    <span className={styles.monthGroupTitle}>{g.vendorName}</span>
                                </div>
                                
                                <div className={styles.monthGroupSummaryPills}>
                                    <div className={styles.summaryPill}>
                                        <span className={styles.pillValue}>{g.stats.count}</span>
                                        <span className={styles.pillLabel}>dues</span>
                                    </div>
                                    <div className={styles.summaryPill}>
                                        <span className={styles.pillValue}>{formatCurrency(g.stats.totalAmount)}</span>
                                        <span className={styles.pillLabel}>total</span>
                                    </div>
                                    <div className={styles.summaryPill}>
                                        <span className={styles.pillValue}>{formatCurrency(g.stats.amountPaid)}</span>
                                        <span className={styles.pillLabel}>paid</span>
                                    </div>
                                    {g.stats.balance > 0 && (
                                        <div className={`${styles.summaryPill} ${styles.pillWarning}`}>
                                            <span className={styles.pillValue}>{formatCurrency(g.stats.balance)}</span>
                                            <span className={styles.pillLabel}>outstanding</span>
                                        </div>
                                    )}
                                    {g.stats.overdueCount > 0 && (
                                        <div className={`${styles.summaryPill} ${styles.pillUrgent}`}>
                                            <span className={styles.pillValue}>{g.stats.overdueCount}</span>
                                            <span className={styles.pillLabel}>overdue</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vendor collapsible content list */}
                            <div className={`${styles.monthGroupContent} ${expandedVendors[g.vendorName] ? styles.monthGroupContentExpanded : ''}`}>
                                {renderTable(g.payments)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pay Vendor Modal */}
            {isPayModalOpen && selectedPayment && (
                <div className="global-modal-overlay" onClick={() => setIsPayModalOpen(false)}>
                    <div className="global-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Pay Vendor — {selectedPayment.vendor_name}</h2>
                        <p className={styles.modalSubtitle}>
                            {selectedPayment.work_type === 'embroidery' ? 'Embroidery' : 'Dyeing'} outsourcing 
                            {selectedPayment.order_number ? ` for Order #${selectedPayment.order_number}` : ''}
                        </p>

                        <form onSubmit={handlePaySubmit}>
                            {/* Read-only Summary */}
                            <div className={styles.summarySection}>
                                <div className={styles.summaryRow}>
                                    <span>Total job cost:</span>
                                    <span>{formatCurrency(selectedPayment.total_amount)}</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Already paid:</span>
                                    <span className={styles.textGreen}>{formatCurrency(selectedPayment.amount_paid)}</span>
                                </div>
                                <div className={styles.summaryRow} style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '8px', marginTop: '4px' }}>
                                    <strong>Balance remaining:</strong>
                                    <strong className={styles.textRed}>{formatCurrency(selectedPayment.balance)}</strong>
                                </div>
                                <div className={styles.summaryRow} style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    <span>Original payment due date: {selectedPayment.due_date}</span>
                                </div>
                            </div>

                            {/* Payment Entry Form */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Amount paying now (₹)</label>
                                <div className={styles.inputWithBtn}>
                                    <input 
                                        type="number"
                                        className={styles.formInput}
                                        value={payingAmount || ''}
                                        min="1"
                                        max={selectedPayment.balance}
                                        onChange={(e) => setPayingAmount(parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className={styles.btnAction}
                                        onClick={() => setPayingAmount(selectedPayment.balance)}
                                    >
                                        Pay full balance
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Payment Date</label>
                                    <input 
                                        type="date"
                                        className={styles.formInput}
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Payment Mode</label>
                                    <select 
                                        className={styles.formSelect}
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="NEFT">NEFT / Bank Transfer</option>
                                        <option value="UPI">UPI Payment</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Bank transfer">Bank transfer</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Reference / UTR number (Optional)</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="e.g. Transaction ID / UTR"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes (Optional)</label>
                                <textarea 
                                    className={styles.formTextarea}
                                    style={{ height: '60px', resize: 'none' }}
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Instalment context or payment confirmations..."
                                />
                            </div>

                            {/* Instalment History small table */}
                            {selectedPayment.instalments && selectedPayment.instalments.length > 0 && (
                                <div className={styles.historySection}>
                                    <h4 className={styles.historyTitle}>Instalment Payment History</h4>
                                    <table className={styles.historyTable}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Mode</th>
                                                <th>Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPayment.instalments.map((i) => (
                                                <tr key={i.id}>
                                                    <td>{i.date}</td>
                                                    <td style={{ color: '#30D158', fontWeight: '500' }}>{formatCurrency(i.amount)}</td>
                                                    <td>{i.payment_mode}</td>
                                                    <td>{i.reference || 'None'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Audit Activity Timeline */}
                            <div style={{ marginTop: '16px' }}>
                                <h4 className={styles.historyTitle} style={{ marginBottom: '8px' }}>Activity Log</h4>
                                <ActivityTimeline logs={vendorAuditLogs} loading={vendorAuditLoading} />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    className={styles.btnSecondary} 
                                    onClick={() => setIsPayModalOpen(false)}
                                    disabled={processingPayment}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.btnPrimary}
                                    disabled={processingPayment || payingAmount <= 0}
                                >
                                    {processingPayment ? 'Confirming...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Manual Outstanding Due Modal */}
            {isManualModalOpen && (
                <div className="global-modal-overlay" onClick={() => setIsManualModalOpen(false)}>
                    <div className="global-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Add Payment Due</h2>
                        <p className={styles.modalSubtitle}>Register a manual outsourced payment due outside of standard orders workflow</p>

                        <form onSubmit={handleManualSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Select External Vendor</label>
                                <select 
                                    className={styles.formSelect}
                                    value={manualVendorId}
                                    onChange={(e) => setManualVendorId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose outsourcing vendor --</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.contact || 'No Contact'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Work Category</label>
                                    <select 
                                        className={styles.formSelect}
                                        value={manualWorkType}
                                        onChange={(e) => setManualWorkType(e.target.value as 'embroidery' | 'dyeing')}
                                    >
                                        <option value="embroidery">Embroidery Work</option>
                                        <option value="dyeing">Dyeing Work</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Total Cost Owed (₹)</label>
                                    <input 
                                        type="number"
                                        className={styles.formInput}
                                        value={manualAmount || ''}
                                        min="1"
                                        onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="Owed amount in ₹"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Due Date</label>
                                <input 
                                    type="date"
                                    className={styles.formInput}
                                    value={manualDueDate}
                                    onChange={(e) => setManualDueDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Internal notes / Context</label>
                                <textarea 
                                    className={styles.formTextarea}
                                    style={{ height: '70px', resize: 'none' }}
                                    value={manualNotes}
                                    onChange={(e) => setManualNotes(e.target.value)}
                                    placeholder="Add references, invoice codes or delivery details..."
                                />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    className={styles.btnSecondary} 
                                    onClick={() => setIsManualModalOpen(false)}
                                    disabled={savingManual}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.btnPrimary}
                                    disabled={savingManual || !manualVendorId || manualAmount <= 0}
                                >
                                    {savingManual ? 'Saving...' : 'Register Due'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Due Date Modal */}
            {isEditDateModalOpen && selectedPayment && (
                <div className="global-modal-overlay" onClick={() => setIsEditDateModalOpen(false)}>
                    <div className="global-modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Edit Due Date</h2>
                        <p className={styles.modalSubtitle}>Change payment target date for {selectedPayment.vendor_name}</p>

                        <form onSubmit={handleEditDateSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>New Payment Due Date</label>
                                <input 
                                    type="date"
                                    className={styles.formInput}
                                    value={editDueDateVal}
                                    onChange={(e) => setEditDueDateVal(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    className={styles.btnSecondary} 
                                    onClick={() => setIsEditDateModalOpen(false)}
                                    disabled={savingDueDate}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.btnPrimary}
                                    disabled={savingDueDate || !editDueDateVal}
                                >
                                    {savingDueDate ? 'Saving...' : 'Save New Date'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
