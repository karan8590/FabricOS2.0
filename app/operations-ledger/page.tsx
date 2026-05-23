'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Clock, Play, CheckCircle2, 
    Truck, Receipt, CreditCard, 
    Filter, ArrowUpRight, AlertCircle, Info,
    X, ChevronDown, Search
} from 'lucide-react';
import StatWidget from '@/components/ui/StatWidget';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import PaymentModal from '@/components/invoices/PaymentModal';
import styles from './OperationsLedger.module.css';

const MONTHS = [
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

const YEARS = ['2023', '2024', '2025', '2026'];

export default function OperationsLedger() {
    const now = new Date();
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    
    // Quick Filters State
    const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

    // Payment Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        fetchLedgerData();
    }, [selectedMonth, selectedYear]);

    const fetchLedgerData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                month: selectedMonth,
                year: selectedYear
            });
            const res = await fetch(`/api/operations-ledger?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setData(json.rows);
                setStats(json.stats);
            }
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (orderId: number) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/approve`, { method: 'PATCH' });
            if (res.ok) fetchLedgerData();
        } catch (error) {
            console.error('Approve error:', error);
        }
    };

    const handleUpdateStatus = async (orderId: number, status: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) fetchLedgerData();
        } catch (error) {
            console.error('Status update error:', error);
        }
    };

    const handleGenerateInvoice = async (orderId: number) => {
        try {
            const res = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, dueDays: 7 }),
            });
            if (res.ok) fetchLedgerData();
        } catch (error) {
            console.error('Invoice generation error:', error);
        }
    };

    const handleRecordPayment = (row: any) => {
        const invoice = {
            id: row.invoice_id,
            invoice_number: row.invoice_number,
            customer_name: row.customer_name,
            amount: row.totalAmount,
            amount_paid: row.paidAmount
        };
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
    };

    const handleSavePayment = async (paymentData: any) => {
        if (!selectedInvoice) return;
        try {
            const res = await fetch(`/api/invoices/${selectedInvoice.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
            if (res.ok) {
                setIsPaymentModalOpen(false);
                fetchLedgerData();
            }
        } catch (error) {
            console.error('Payment save error:', error);
        }
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const getOrderConfig = (status: string, isOverdue: boolean) => {
        const s = status.toUpperCase();
        if (isOverdue) return { label: 'Payment Issue', class: styles.rowOverdue, icon: <AlertCircle size={14} /> };
        if (s === 'PENDING') return { label: 'Waiting Approval', class: styles.rowPending, icon: <Clock size={14} /> };
        if (['APPROVED', 'EMBROIDERY_IN_PROGRESS', 'PRINTING_IN_FACTORY', 'DYEING_IN_PROGRESS', 'READY'].includes(s)) return { label: 'In Production', class: styles.rowInProduction, icon: <Play size={14} /> };
        if (s === 'READY') return { label: 'Ready', class: styles.rowReady, icon: <CheckCircle2 size={14} /> };
        if (s === 'DELIVERED') return { label: 'Delivered', class: styles.rowDelivered, icon: <Truck size={14} /> };
        if (s === 'INVOICED' || s === 'COMPLETED') return { label: 'Invoice Generated', class: styles.rowCompleted, icon: <Receipt size={14} /> };
        return { label: status, class: '', icon: null };
    };

    const filteredRows = useMemo(() => {
        return data.filter(row => 
            row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.order_id.toString().includes(searchTerm) ||
            (row.order_number && row.order_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [data, searchTerm]);

    const activeMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;

    return (
        <div className={styles.container}>
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setIsPaymentModalOpen(false)} 
                invoice={selectedInvoice} 
                onSave={handleSavePayment} 
            />

            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>Operations Ledger <span className={styles.betaBadge}>BETA</span></h1>
                    <p className={styles.subtitle}>Unified manufacturing & financial workflow control center</p>
                </div>
                <div className={styles.alert}>
                    <Info size={16} />
                    <span>Experimental Workspace. Functional Actions Enabled.</span>
                </div>
            </div>

            {/* Top Widgets */}
            <div className={styles.widgetRow}>
                <StatWidget 
                    label="Pending Production" 
                    value={stats?.pendingProduction || 0} 
                    accentColor="#FFCC00" 
                    icon={<Clock />} 
                    badge={`${selectedMonth === (now.getMonth()+1).toString() ? 'Current Month' : activeMonthLabel}`}
                />
                <StatWidget 
                    label="Delivered Orders" 
                    value={stats?.deliveredOrders || 0} 
                    accentColor="#34C759" 
                    icon={<Truck />} 
                />
                <StatWidget 
                    label="Outstanding Payments" 
                    value={formatCurrency(stats?.outstandingPayments || 0)} 
                    accentColor="#FF9500" 
                    icon={<AlertCircle />} 
                />
                <StatWidget 
                    label="Revenue Collected" 
                    value={formatCurrency(stats?.revenueCollected || 0)} 
                    accentColor="#0071E3" 
                    icon={<ArrowUpRight />} 
                />
            </div>

            {/* Quick Filter Bar */}
            <div className={styles.controlsBar}>
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input 
                        type="text" 
                        placeholder="Search customer or order..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.quickSelectors}>
                    <div className={styles.selectWrapper}>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className={styles.select}
                        >
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDown size={14} className={styles.selectIcon} />
                    </div>

                    <div className={styles.selectWrapper}>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className={styles.select}
                        >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown size={14} className={styles.selectIcon} />
                    </div>

                    <button className={styles.filterBtn}>
                        <Filter size={16} />
                        <span>Advanced</span>
                    </button>
                </div>
            </div>

            {/* Active Filters Display */}
            <div className={styles.filterPills}>
                <div className={styles.pill}>
                    <span>Month: {activeMonthLabel}</span>
                    <button onClick={() => setSelectedMonth((now.getMonth() + 1).toString())}><X size={12} /></button>
                </div>
                <div className={styles.pill}>
                    <span>Year: {selectedYear}</span>
                    <button onClick={() => setSelectedYear(now.getFullYear().toString())}><X size={12} /></button>
                </div>
                {searchTerm && (
                    <div className={styles.pill}>
                        <span>Search: {searchTerm}</span>
                        <button onClick={() => setSearchTerm('')}><X size={12} /></button>
                    </div>
                )}
            </div>

            {/* Unified Table */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Design</th>
                            <th>Qty</th>
                            <th>Order Status</th>
                            <th>Total</th>
                            <th>Payment Progress</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={11} className={styles.tableLoading}>Refreshing Ledger...</td></tr>
                        ) : filteredRows.length === 0 ? (
                            <tr><td colSpan={11} className={styles.emptyState}>No records found for this period.</td></tr>
                        ) : (
                            filteredRows.map(row => {
                                const status = row.order_status?.toUpperCase() || 'PENDING';
                                const isFinished = status === 'COMPLETED' || status === 'INVOICED';
                                const deliveryDeadline = row.order_date + (7 * 24 * 60 * 60);
                                const isOverdue = !isFinished && Math.floor(Date.now()/1000) > deliveryDeadline;

                                const orderConfig = getOrderConfig(row.order_status, isOverdue);
                                
                                return (
                                    <tr key={row.order_id} className={`${styles.row} ${orderConfig.class}`}>
                                        <td>
                                            <div className={styles.orderIdCell}>
                                                <span className={styles.orderNumber}>{row.order_number || `ORD-${row.order_id}`}</span>
                                                <span className={styles.orderDate}>{new Date(row.order_date * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.customerCell}>
                                                <span className={styles.customerName}>{row.customer_name}</span>
                                            </div>
                                        </td>
                                        <td><span className={styles.designName}>{row.design_name}</span></td>
                                        <td><span className={styles.qty}>{row.quantity_meters}m</span></td>
                                        <td>
                                            <div className={styles.statusPill}>
                                                {orderConfig.icon}
                                                <span>{orderConfig.label}</span>
                                            </div>
                                        </td>
                                        <td className={styles.amount}>{formatCurrency(row.totalAmount)}</td>
                                        <td>
                                            <div className={styles.paymentContainer} title={`Paid: ${formatCurrency(row.paidAmount)}\nRemaining: ${formatCurrency(row.pendingAmount)}\nDue: ${row.due_date ? new Date(row.due_date * 1000).toLocaleDateString() : 'N/A'}`}>
                                                <div className={styles.paymentInfo}>
                                                    <span className={styles.paidText}>{formatCurrency(row.paidAmount)}</span>
                                                    <span className={styles.totalText}> / {formatCurrency(row.totalAmount)}</span>
                                                </div>
                                                <div className={styles.progressTrack}>
                                                    <div 
                                                        className={`${styles.progressBar} ${
                                                            row.pendingAmount === 0 ? styles.progressFull :
                                                            row.paidAmount === 0 ? styles.progressUnpaid :
                                                            (row.paidAmount / row.totalAmount) > 0.8 ? styles.progressMostly :
                                                            styles.progressPartial
                                                        }`} 
                                                        style={{ width: `${Math.min(100, (row.paidAmount / row.totalAmount) * 100)}%` }} 
                                                    />
                                                </div>
                                                <div className={styles.remainingBox}>
                                                    {row.pendingAmount === 0 ? (
                                                        <span className={styles.fullyPaid}>Fully Paid ✓</span>
                                                    ) : (
                                                        <span className={styles.remainingText}>{formatCurrency(row.pendingAmount)} remaining</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.dueDate}>
                                                {row.due_date ? new Date(row.due_date * 1000).toLocaleDateString() : '—'}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <div className={styles.actionGroup}>
                                                {row.order_status === 'pending' && (
                                                    <button className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => handleApprove(row.order_id)}>Approve</button>
                                                )}
                                                {(row.order_status === 'approved' || row.order_status === 'in production') && (
                                                    <button className={`${styles.actionBtn} ${styles.btnMarkReady}`} onClick={() => handleUpdateStatus(row.order_id, 'ready')}>Mark Ready</button>
                                                )}
                                                {row.order_status === 'ready' && (
                                                    <button className={`${styles.actionBtn} ${styles.btnMarkDelivered}`} onClick={() => handleUpdateStatus(row.order_id, 'delivered')}>Mark Delivered</button>
                                                )}
                                                {row.order_status === 'delivered' && row.invoiceStatus === 'not_generated' && (
                                                    <button className={`${styles.actionBtn} ${styles.btnGenerateInvoice}`} onClick={() => handleGenerateInvoice(row.order_id)}>Generate Invoice</button>
                                                )}
                                                {(row.invoiceStatus === 'unpaid' || row.invoiceStatus === 'generated') && (
                                                    <button className={`${styles.actionBtn} ${styles.btnRecordPayment}`} onClick={() => handleRecordPayment(row)}>Record Payment</button>
                                                )}
                                                {row.invoiceStatus === 'partial' && (
                                                    <button className={`${styles.actionBtn} ${styles.btnRecordPayment}`} onClick={() => handleRecordPayment(row)}>Add Payment</button>
                                                )}
                                                {row.invoiceStatus === 'paid' && (
                                                    <div className={styles.statusBadge}>✓ Paid</div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
