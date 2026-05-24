'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Can from '@/components/auth/Can';
import Input from '@/components/ui/Input';
import PaymentModal from '@/components/invoices/PaymentModal';
import { generateInvoicePDF } from '@/lib/pdf/generateInvoice';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import StatWidget from '@/components/ui/StatWidget';
import ViewingPeriodSelector from '@/components/ui/ViewingPeriodSelector';
import styles from './Invoices.module.css';
import tableStyles from '@/components/ui/Table.module.css';
import { Calendar, ChevronRight, ChevronDown, Layers, Grid, FileText, CheckCircle, AlertTriangle, FileSearch, Eye, Download, Send, RefreshCw, Loader2, MoreHorizontal } from 'lucide-react';
import { formatCurrencySafe } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Invoice {
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    order_id: number;
    amount: number;
    amount_paid: number;
    status: 'paid' | 'unpaid' | 'overdue' | 'partial';
    generated_at: number;
    due_date?: number;
    paid_at?: number;
    last_payment_date?: number;
    pdf_url?: string;
    telegram_delivered?: number;
    telegram_sent_at?: number;
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [activeWidget, setActiveWidget] = useState<string | null>(null);

    // Grouping & Period Selector states
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
    const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
    const [selectedMonthState, setSelectedMonthState] = useState<string>(() => (new Date().getMonth() + 1).toString());
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
        const today = new Date();
        const currentYear = today.getFullYear().toString();
        const currentMonth = (today.getMonth() + 1).toString();
        return { [`${currentYear}-${currentMonth}`]: true };
    });

    // Custom handlers for PDF preview, resend, and regeneration
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [previewInvoiceNum, setPreviewInvoiceNum] = useState<string | null>(null);
    const [sendingTelegramId, setSendingTelegramId] = useState<number | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

    const years = ['All Years', '2023', '2024', '2025', '2026'];
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
    const [availableFilters, setAvailableFilters] = useState<FilterDefinition[]>([
        { id: 'status', label: 'Status', type: 'select', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ), options: [
            { value: 'paid', label: 'Paid' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partial' },
            { value: 'overdue', label: 'Overdue' },
        ]},
        { id: 'amount', label: 'Amount', type: 'number', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
        )},
        { id: 'date_range', label: 'Date Range', type: 'dateRange', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        )},
    ]);
    const [sortBy, setSortBy] = useState('generated_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const res = await fetch('/api/customers');
                if (res.ok) {
                    const data = await res.json();
                    const customerOptions = data.customers.map((c: any) => ({
                        value: c.id.toString(),
                        label: c.name
                    }));
                    setAvailableFilters(prev => [
                        ...prev,
                        { id: 'customer_id', label: 'Customer', type: 'select', icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        ), options: customerOptions }
                    ]);
                }
            } catch (error) {
                console.error('Failed to fetch filter data:', error);
            }
        };

        fetchFilterData();
        fetchInvoices();
    }, [sortBy, sortOrder]);

    const fetchInvoices = async (filters: FilterRow[] = [], search: string = searchTerm) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('sortBy', sortBy);
            params.append('sortOrder', sortOrder);
            if (search) params.append('search', search);
            
            filters.forEach(f => {
                if (f.fieldId === 'status') {
                    if (Array.isArray(f.value)) {
                        f.value.forEach(v => params.append('status', v));
                    } else {
                        params.append('status', f.value);
                    }
                }
                if (f.fieldId === 'customer_id') params.append('customerId', f.value);
                if (f.fieldId === 'amount') {
                    if (f.operator === 'is') {
                        params.set('minAmount', f.value);
                        params.set('maxAmount', f.value);
                    } else if (f.operator === 'greater than') {
                        params.set('minAmount', f.value);
                    } else if (f.operator === 'less than') {
                        params.set('maxAmount', f.value);
                    } else if (f.operator === 'between') {
                        if (f.value?.start) params.set('minAmount', f.value.start);
                        if (f.value?.end) params.set('maxAmount', f.value.end);
                    }
                } else if (f.fieldId === 'date_range') {
                    if (f.value?.start) params.set('dateStart', f.value.start);
                    if (f.value?.end) params.set('dateEnd', f.value.end);
                }
            });

            const res = await fetch(`/api/invoices?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(data.invoices);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = formatCurrencySafe;

    const searchFilteredInvoices = useMemo(() => {
        return invoices.filter(
            (invoice) =>
                invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [invoices, searchTerm]);

    const timeFilteredInvoices = useMemo(() => {
        let result = searchFilteredInvoices;

        if (selectedYear !== 'All Years') {
            result = result.filter(inv => {
                const date = new Date(inv.generated_at * 1000);
                return date.getFullYear().toString() === selectedYear;
            });
        }

        if (selectedMonthState !== 'all') {
            result = result.filter(inv => {
                const date = new Date(inv.generated_at * 1000);
                return (date.getMonth() + 1).toString() === selectedMonthState;
            });
        }

        return result;
    }, [searchFilteredInvoices, selectedYear, selectedMonthState]);

    const stats = useMemo(() => {
        const totalInvoices = timeFilteredInvoices.length;
        const totalBilled = timeFilteredInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        const paidInvoices = timeFilteredInvoices.filter(i => i.status === 'paid');
        const paidAmount = paidInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        const outstandingAmount = timeFilteredInvoices
            .filter(i => i.status !== 'paid')
            .reduce((s, i) => s + (i.amount - (i.amount_paid || 0)), 0);
        const now = Math.floor(Date.now() / 1000);
        const overdueInvoices = timeFilteredInvoices.filter(i => 
            i.status !== 'paid' && i.due_date && i.due_date < now
        );
        return { 
            totalInvoices, 
            totalBilled, 
            paidCount: paidInvoices.length, 
            paidAmount, 
            outstandingAmount, 
            overdueCount: overdueInvoices.length 
        };
    }, [timeFilteredInvoices]);

    const filteredInvoices = useMemo(() => {
        let result = timeFilteredInvoices;

        if (activeWidget === 'paid') {
            result = result.filter(i => i.status === 'paid');
        } else if (activeWidget === 'outstanding') {
            result = result.filter(i => i.status !== 'paid')
                .sort((a, b) => (b.amount - (b.amount_paid || 0)) - (a.amount - (a.amount_paid || 0)));
        } else if (activeWidget === 'overdue') {
            const now = Math.floor(Date.now() / 1000);
            result = result.filter(i => i.status !== 'paid' && i.due_date && i.due_date < now)
                .sort((a, b) => (a.due_date || 0) - (b.due_date || 0));
        } else if (activeWidget === 'billed') {
            result = [...result].sort((a, b) => b.amount - a.amount);
        }

        return result;
    }, [timeFilteredInvoices, activeWidget]);

    const groupedSections = useMemo(() => {
        const groups: Record<string, {
            year: string;
            monthNum: string;
            monthName: string;
            key: string;
            invoices: Invoice[];
            stats: {
                count: number;
                billed: number;
                collected: number;
                outstanding: number;
                overdueCount: number;
            };
        }> = {};

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        filteredInvoices.forEach(inv => {
            const d = new Date(inv.generated_at * 1000);
            const y = d.getFullYear().toString();
            const mNum = (d.getMonth() + 1).toString();
            const key = `${y}-${mNum}`;

            if (!groups[key]) {
                groups[key] = {
                    year: y,
                    monthNum: mNum,
                    monthName: monthNames[d.getMonth()],
                    key,
                    invoices: [],
                    stats: { count: 0, billed: 0, collected: 0, outstanding: 0, overdueCount: 0 }
                };
            }

            groups[key].invoices.push(inv);
            groups[key].stats.count += 1;
            groups[key].stats.billed += (inv.amount || 0);
            groups[key].stats.collected += (inv.amount_paid || 0);
            groups[key].stats.outstanding += Math.max(0, (inv.amount || 0) - (inv.amount_paid || 0));

            const now = Math.floor(Date.now() / 1000);
            if (inv.status !== 'paid' && inv.due_date && inv.due_date < now) {
                groups[key].stats.overdueCount += 1;
            }
        });

        return Object.values(groups).sort((a, b) => {
            if (a.year !== b.year) {
                return parseInt(b.year) - parseInt(a.year);
            }
            return parseInt(b.monthNum) - parseInt(a.monthNum);
        });
    }, [filteredInvoices]);

    const toggleMonth = (key: string) => {
        setExpandedMonths(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Actions & Resend Telegram Handlers
    const handleResendTelegram = async (invoice: Invoice) => {
        setSendingTelegramId(invoice.id);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/resend`, { method: 'POST' });
            if (res.ok) {
                alert('Invoice PDF resent successfully via Telegram!');
                fetchInvoices();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to resend Telegram notification');
            }
        } catch (error) {
            console.error('Telegram dispatch error:', error);
            alert('Failed to connect to server');
        } finally {
            setSendingTelegramId(null);
        }
    };

    const handleRegenerateInvoice = async (invoice: Invoice) => {
        setRegeneratingId(invoice.id);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/regenerate`, { method: 'POST' });
            if (res.ok) {
                alert('Invoice PDF regenerated successfully!');
                fetchInvoices();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to regenerate invoice');
            }
        } catch (error) {
            console.error('Regeneration error:', error);
            alert('Failed to connect to server');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleDownloadPDF = (invoice: any) => {
        if (invoice.pdf_url) {
            const link = document.createElement('a');
            link.href = invoice.pdf_url;
            link.download = `${invoice.invoice_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            generateInvoicePDF(invoice);
        }
    };

    const handlePreviewPDF = (invoice: any) => {
        if (invoice.pdf_url) {
            setPreviewPdfUrl(invoice.pdf_url);
            setPreviewInvoiceNum(invoice.invoice_number);
        } else {
            alert('PDF file path not found. Try regenerating the invoice first.');
        }
    };

    const renderMobileInvoiceCard = (invoice: Invoice) => {
        const remaining = getDaysRemaining(invoice.due_date, invoice.status);
        const paid = invoice.amount_paid || 0;
        const balance = Math.max(0, invoice.amount - paid);
        const progressPercent = Math.min(100, (paid / (invoice.amount || 1)) * 100);

        return (
            <div key={invoice.id} className={styles.mobileCard}>
                {/* Header: Badge & Amount */}
                <div className={styles.mobileCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge status={invoice.status} />
                        {invoice.telegram_delivered === 1 ? (
                            <span 
                                title="Telegram delivered" 
                                style={{ display: 'inline-flex', color: '#38bdf8', fontSize: '10px', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}
                            >
                                Sent
                            </span>
                        ) : (
                            <span 
                                title="Telegram unsent" 
                                style={{ display: 'inline-flex', color: 'var(--color-text-tertiary)', fontSize: '10px', background: 'var(--bg-card-alt)', padding: '2px 6px', borderRadius: '4px' }}
                            >
                                Unsent
                            </span>
                        )}
                    </div>
                    <span className={styles.mobilePrice}>
                        ₹{invoice.amount.toLocaleString('en-IN')}
                    </span>
                </div>

                {/* Body: Customer, ID, Date, Balance, Progress Bar */}
                <div className={styles.mobileCardBody}>
                    <div className={styles.mobileCustomerName}>
                        {invoice.customer_name}
                    </div>
                    <div className={styles.mobileMetaGroup}>
                        <div className={styles.mobileMetaRow}>
                            <span>Invoice ID:</span>
                            <strong>{invoice.invoice_number}</strong>
                        </div>
                        <div className={styles.mobileMetaRow}>
                            <span>Order Ref:</span>
                            <strong>#{invoice.order_id}</strong>
                        </div>
                        {invoice.due_date && (
                            <div className={styles.mobileMetaRow}>
                                <span>Due Date:</span>
                                <span>{formatDate(invoice.due_date)} ({remaining.text})</span>
                            </div>
                        )}
                        <div className={styles.mobileMetaRow}>
                            <span>Balance Remaining:</span>
                            {balance > 0 ? (
                                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>₹{balance.toLocaleString('en-IN')}</span>
                            ) : (
                                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Fully Paid</span>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className={styles.mobileProgressContainer}>
                        <div className={styles.mobileProgressText}>
                            <span>₹{paid.toLocaleString('en-IN')} paid</span>
                            <span>{progressPercent.toFixed(0)}%</span>
                        </div>
                        <div className={styles.mobileProgressBar}>
                            <div 
                                className={styles.mobileProgressFill} 
                                style={{ 
                                    width: `${progressPercent}%`, 
                                    backgroundColor: invoice.status === 'paid' ? 'var(--color-success)' : 'var(--color-accent-primary)' 
                                }} 
                            />
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className={styles.mobileCardActions} style={{ flexWrap: 'wrap', gap: '6px' }}>
                    <InvoiceActionButton invoice={invoice} onPay={() => handleRecordPayment(invoice)} />
                    <InvoiceActionMenu 
                        invoice={invoice} 
                        onPreview={() => handlePreviewPDF(invoice)}
                        onDownload={() => handleDownloadPDF(invoice)}
                        onResendTelegram={() => handleResendTelegram(invoice)}
                        onRegenerate={() => handleRegenerateInvoice(invoice)}
                        sendingTelegramId={sendingTelegramId}
                        regeneratingId={regeneratingId}
                    />
                </div>
            </div>
        );
    };

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    const handleApplyFilters = (filters: FilterRow[]) => {
        setActiveFilters(filters);
        fetchInvoices(filters);
    };

    const handleRemoveFilter = (id: string) => {
        const newFilters = activeFilters.filter(f => f.id !== id);
        setActiveFilters(newFilters);
        fetchInvoices(newFilters);
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const handleRecordPayment = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
    };

    const handleSavePayment = async (data: { amount: number; date: string; notes: string }) => {
        if (!selectedInvoice) return;
        try {
            const res = await fetch(`/api/invoices/${selectedInvoice.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                fetchInvoices();
                setIsPaymentModalOpen(false);
            } else {
                const errorData = await res.json();
                alert(`Payment failed: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Failed to connect to server');
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return <svg className={tableStyles.sortIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5" /></svg>;
        }
        return sortOrder === 'asc' ? (
            <svg className={tableStyles.sortIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 14l5-5 5 5" /></svg>
        ) : (
            <svg className={tableStyles.sortIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5" /></svg>
        );
    };

    const getDaysRemaining = (dueDate: number | undefined, status: string) => {
        if (status === 'paid') return { text: 'Paid', color: 'var(--color-success)' };
        if (!dueDate) return { text: '-', color: 'var(--color-text-tertiary)' };
        const now = Math.floor(Date.now() / 1000);
        const diffDays = Math.ceil((dueDate - now) / (24 * 60 * 60));
        if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: 'var(--color-error)' };
        if (diffDays === 0) return { text: 'Due Today', color: 'var(--color-warning)' };
        return { text: `${diffDays} days left`, color: 'var(--color-text-secondary)' };
    };

    const widgetConfig = [
        { id: 'total', label: 'Total Invoices', value: stats.totalInvoices, color: 'blue', icon: 'file' },
        { id: 'billed', label: 'Total Billed', value: formatCurrency(stats.totalBilled), color: 'green', icon: 'rupee' },
        { id: 'paid', label: 'Paid', value: stats.paidCount, color: 'green', icon: 'check', secondary: `${formatCurrency(stats.paidAmount)} collected` },
        { id: 'outstanding', label: 'Outstanding', value: formatCurrency(stats.outstandingAmount), color: 'orange', icon: 'clock' },
        { id: 'overdue', label: 'Overdue', value: stats.overdueCount, color: 'red', icon: 'alert' },
    ];

    return (
        <div className={styles.invoicesPage}>
            <div className={styles.header}>
                <h1 className={styles.title}>Invoices</h1>
                <p className={styles.subtitle}>Manage and track all customer invoices</p>
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
                            w.color === 'orange' ? '#FF9500' : '#FF3B30'
                        }
                        accentBg={
                            w.color === 'blue' ? 'rgba(0,113,227,0.04)' :
                            w.color === 'green' ? 'rgba(52,199,89,0.04)' :
                            w.color === 'orange' ? 'rgba(255,149,0,0.04)' : 'rgba(255,59,48,0.04)'
                        }
                        onClick={() => setActiveWidget(activeWidget === w.id ? null : w.id)}
                        pulse={w.id === 'overdue' && stats.overdueCount > 0}
                        badge={
                            w.id === 'overdue' ? (stats.overdueCount > 0 ? 'Action needed' : 'All clear') :
                            w.id === 'paid' ? `${Math.round((stats.paidCount / (stats.totalInvoices || 1)) * 100)}% of total` :
                            w.id === 'outstanding' ? `${stats.totalInvoices - stats.paidCount} invoices` : '▲ 12.5%'
                        }
                        badgeType={
                            w.id === 'overdue' ? (stats.overdueCount > 0 ? 'urgent' : 'positive') :
                            w.id === 'paid' ? (stats.paidCount / (stats.totalInvoices || 1) > 0.5 ? 'positive' : 'neutral') : 'neutral'
                        }
                        icon={
                            w.icon === 'file' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z"/><path d="M13 2v7h7"/></svg> :
                            w.icon === 'rupee' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 015-5"/></svg> :
                            w.icon === 'check' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> :
                            w.icon === 'clock' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> :
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

            <div className={styles.controls}>
                <div className={styles.leftControls}>
                    <div className={styles.searchWrapper}>
                        <Input
                            placeholder="Search by invoice number or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                        />
                    </div>
                    <AdvancedFilter 
                        availableFilters={availableFilters}
                        onApply={handleApplyFilters}
                        activeFilters={activeFilters}
                        resultsCount={filteredInvoices.length}
                    />
                    <ViewingPeriodSelector
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonthState}
                        onChangeYear={setSelectedYear}
                        onChangeMonth={setSelectedMonthState}
                        years={years}
                        months={months}
                        compact={true}
                    />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Loading invoices...</span>
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ height: '64px', background: 'var(--bg-secondary)', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
                    ))}
                </div>
            ) : (
                <div className={styles.resultsWrapper}>
                    {filteredInvoices.length === 0 ? (
                        <div className={tableStyles.emptyState}>
                            <div className={tableStyles.emptyIcon}><FileSearch size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} /></div>
                            <h3 className={tableStyles.emptyTitle}>No Invoices Found</h3>
                            <p className={tableStyles.emptyText}>{searchTerm ? 'Try adjusting your search or filters' : 'Invoices will appear here once orders are completed'}</p>
                        </div>
                    ) : viewMode === 'grouped' ? (
                        <div className={styles.groupedContainer}>
                            {groupedSections.map(section => {
                                const isExpanded = !!expandedMonths[section.key];
                                return (
                                    <div key={section.key} className={styles.monthGroup}>
                                        <div 
                                            className={styles.monthGroupHeader}
                                            onClick={() => toggleMonth(section.key)}
                                        >
                                            <div className={styles.monthGroupTitleGroup}>
                                                <ChevronDown 
                                                    size={16} 
                                                    className={`${styles.collapseArrow} ${isExpanded ? styles.collapseArrowExpanded : ''}`}
                                                />
                                                <span className={styles.monthGroupTitle}>{section.monthName.toUpperCase()} {section.year}</span>
                                            </div>

                                            <div className={styles.monthGroupSummaryPills}>
                                                <div className={styles.summaryPill}>
                                                    <span className={styles.pillValue}>{section.stats.count}</span>
                                                    <span className={styles.pillLabel}>invoices</span>
                                                </div>
                                                <div className={styles.summaryPill}>
                                                    <span className={styles.pillValue}>₹{section.stats.billed.toLocaleString()}</span>
                                                    <span className={styles.pillLabel}>billed</span>
                                                </div>
                                                <div className={styles.summaryPill}>
                                                    <span className={styles.pillValue}>₹{section.stats.collected.toLocaleString()}</span>
                                                    <span className={styles.pillLabel}>collected</span>
                                                </div>
                                                <div className={`${styles.summaryPill} ${section.stats.outstanding > 0 ? styles.pillWarning : ''}`}>
                                                    <span className={styles.pillValue}>₹{section.stats.outstanding.toLocaleString()}</span>
                                                    <span className={styles.pillLabel}>outstanding</span>
                                                </div>
                                                {section.stats.overdueCount > 0 && (
                                                    <div className={`${styles.summaryPill} ${styles.pillUrgent}`}>
                                                        <span className={styles.pillValue}>{section.stats.overdueCount}</span>
                                                        <span className={styles.pillLabel}>overdue</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`${styles.monthGroupContent} ${isExpanded ? styles.monthGroupContentExpanded : ''}`}>
                                            <div className={tableStyles.tableContainer} style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
                                                <table className={tableStyles.table}>
                                                    <thead className={tableStyles.thead}>
                                                        <tr>
                                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('invoice_number')}>Invoice ID{getSortIcon('invoice_number')}</th>
                                                            <th className={tableStyles.th}>Customer Name</th>
                                                            <th className={tableStyles.th}>Order Ref</th>
                                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('amount')}>Amount{getSortIcon('amount')}</th>
                                                            <th className={tableStyles.th}>Payment Progress</th>
                                                            <th className={tableStyles.th}>Balance</th>
                                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('status')}>Status{getSortIcon('status')}</th>
                                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('generated_at')}>Date{getSortIcon('generated_at')}</th>
                                                            <th className={tableStyles.th}>Due Date</th>
                                                            <th className={tableStyles.th}>Time Left</th>
                                                            <th className={tableStyles.th}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className={tableStyles.tbody}>
                                                        {section.invoices.map((invoice) => {
                                                            const remaining = getDaysRemaining(invoice.due_date, invoice.status);
                                                            const paid = invoice.amount_paid || 0;
                                                            const balance = Math.max(0, invoice.amount - paid);
                                                            return (
                                                                <tr key={invoice.id} className={tableStyles.tr}>
                                                                    <td className={tableStyles.td}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <strong>{invoice.invoice_number}</strong>
                                                                            {invoice.telegram_delivered === 1 ? (
                                                                                <span 
                                                                                    title={`Telegram delivered at ${invoice.telegram_sent_at ? new Date(invoice.telegram_sent_at * 1000).toLocaleString() : ''}`}
                                                                                    style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', color: '#0071E3', backgroundColor: 'rgba(0, 113, 227, 0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}
                                                                                >
                                                                                    Telegram Sent
                                                                                </span>
                                                                            ) : (
                                                                                <span 
                                                                                    title="Telegram delivery pending or failed"
                                                                                    style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-grouped)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}
                                                                                >
                                                                                    Unsent
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className={tableStyles.td}>{invoice.customer_name}<br /><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{invoice.customer_phone}</span></td>
                                                                    <td className={tableStyles.td}>#{invoice.order_id}</td>
                                                                    <td className={`${tableStyles.td} ${tableStyles.amount}`}>₹{invoice.amount.toLocaleString()}</td>
                                                                    <td className={tableStyles.td}>
                                                                        <div className={styles.progressContainer}>
                                                                            <div className={styles.progressText}><span>₹{paid.toLocaleString()}</span><span className={styles.progressTotal}> / ₹{invoice.amount.toLocaleString()}</span></div>
                                                                            <div className={styles.progressBar}>
                                                                                <div className={styles.progressFill} style={{ width: `${Math.min(100, (paid / (invoice.amount || 1)) * 100)}%`, backgroundColor: '#16A34A' }} />
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className={`${tableStyles.td} ${tableStyles.amount}`}>{balance > 0 ? <span style={{ color: 'var(--color-warning)' }}>₹{balance.toLocaleString()}</span> : <span style={{ color: 'var(--color-success)' }}>-</span>}</td>
                                                                    <td className={tableStyles.td}><Badge status={invoice.status} /></td>
                                                                    <td className={tableStyles.td}>{formatDate(invoice.generated_at)}</td>
                                                                    <td className={tableStyles.td}>{invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                                                                    <td className={tableStyles.td}><span style={{ color: remaining.color, fontWeight: 500 }}>{remaining.text}</span></td>
                                                                    <td className={tableStyles.td}>
                                                                        <div className={tableStyles.actions} style={{ gap: '6px' }}>
                                                                            <InvoiceActionButton invoice={invoice} onPay={() => handleRecordPayment(invoice)} />
                                                                            <InvoiceActionMenu 
                                                                                invoice={invoice} 
                                                                                onPreview={() => handlePreviewPDF(invoice)}
                                                                                onDownload={() => handleDownloadPDF(invoice)}
                                                                                onResendTelegram={() => handleResendTelegram(invoice)}
                                                                                onRegenerate={() => handleRegenerateInvoice(invoice)}
                                                                                sendingTelegramId={sendingTelegramId}
                                                                                regeneratingId={regeneratingId}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {/* Mobile Cards View */}
                                                <div className={styles.mobileCardsList}>
                                                    {section.invoices.map((invoice) => renderMobileInvoiceCard(invoice))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <>
                            <div className={tableStyles.tableContainer}>
                                <table className={tableStyles.table}>
                                    <thead className={tableStyles.thead}>
                                        <tr>
                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('invoice_number')}>Invoice ID{getSortIcon('invoice_number')}</th>
                                            <th className={tableStyles.th}>Customer Name</th>
                                            <th className={tableStyles.th}>Order Ref</th>
                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('amount')}>Amount{getSortIcon('amount')}</th>
                                            <th className={tableStyles.th}>Payment Progress</th>
                                            <th className={tableStyles.th}>Balance</th>
                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('status')}>Status{getSortIcon('status')}</th>
                                            <th className={`${tableStyles.th} ${tableStyles.sortable}`} onClick={() => handleSort('generated_at')}>Date{getSortIcon('generated_at')}</th>
                                            <th className={tableStyles.th}>Due Date</th>
                                            <th className={tableStyles.th}>Time Left</th>
                                            <th className={tableStyles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tableStyles.tbody}>
                                        {paginatedInvoices.map((invoice) => {
                                            const remaining = getDaysRemaining(invoice.due_date, invoice.status);
                                            const paid = invoice.amount_paid || 0;
                                            const balance = Math.max(0, invoice.amount - paid);
                                            return (
                                                <tr key={invoice.id} className={tableStyles.tr}>
                                                    <td className={tableStyles.td}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <strong>{invoice.invoice_number}</strong>
                                                            {invoice.telegram_delivered === 1 ? (
                                                                <span 
                                                                    title={`Telegram delivered at ${invoice.telegram_sent_at ? new Date(invoice.telegram_sent_at * 1000).toLocaleString() : ''}`}
                                                                    style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', color: '#0071E3', backgroundColor: 'rgba(0, 113, 227, 0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}
                                                                >
                                                                    Telegram Sent
                                                                </span>
                                                            ) : (
                                                                <span 
                                                                    title="Telegram delivery pending or failed"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-grouped)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}
                                                                >
                                                                    Unsent
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={tableStyles.td}>{invoice.customer_name}<br /><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{invoice.customer_phone}</span></td>
                                                    <td className={tableStyles.td}>#{invoice.order_id}</td>
                                                    <td className={`${tableStyles.td} ${tableStyles.amount}`}>₹{invoice.amount.toLocaleString()}</td>
                                                    <td className={tableStyles.td}>
                                                        <div className={styles.progressContainer}>
                                                            <div className={styles.progressText}><span>₹{paid.toLocaleString()}</span><span className={styles.progressTotal}> / ₹{invoice.amount.toLocaleString()}</span></div>
                                                            <div className={styles.progressBar}>
                                                                <div className={styles.progressFill} style={{ width: `${Math.min(100, (paid / (invoice.amount || 1)) * 100)}%`, backgroundColor: '#16A34A' }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${tableStyles.td} ${tableStyles.amount}`}>{balance > 0 ? <span style={{ color: 'var(--color-warning)' }}>₹{balance.toLocaleString()}</span> : <span style={{ color: 'var(--color-success)' }}>-</span>}</td>
                                                    <td className={tableStyles.td}><Badge status={invoice.status} /></td>
                                                    <td className={tableStyles.td}>{formatDate(invoice.generated_at)}</td>
                                                    <td className={tableStyles.td}>{invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                                                    <td className={tableStyles.td}><span style={{ color: remaining.color, fontWeight: 500 }}>{remaining.text}</span></td>
                                                    <td className={tableStyles.td}>
                                                        <div className={tableStyles.actions} style={{ gap: '6px' }}>
                                                                            <InvoiceActionButton invoice={invoice} onPay={() => handleRecordPayment(invoice)} />
                                                                            <InvoiceActionMenu 
                                                                                invoice={invoice} 
                                                                                onPreview={() => handlePreviewPDF(invoice)}
                                                                                onDownload={() => handleDownloadPDF(invoice)}
                                                                                onResendTelegram={() => handleResendTelegram(invoice)}
                                                                                onRegenerate={() => handleRegenerateInvoice(invoice)}
                                                                                sendingTelegramId={sendingTelegramId}
                                                                                regeneratingId={regeneratingId}
                                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Mobile Cards View */}
                                <div className={styles.mobileCardsList}>
                                    {paginatedInvoices.map((invoice) => renderMobileInvoiceCard(invoice))}
                                </div>
                            </div>
                            {totalPages > 1 && (
                                <div className={tableStyles.pagination}>
                                    <div className={tableStyles.paginationInfo}>Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}</div>
                                    <div className={tableStyles.paginationButtons}>
                                        <Button variant="ghost" size="small" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                                        <Button variant="ghost" size="small" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
            
            {/* Payment Modal */}
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} invoice={selectedInvoice} onSave={handleSavePayment} />

            {/* Premium PDF Preview Modal */}
            {previewPdfUrl && (
                <div className="global-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '850px',
                        height: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-card)'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Invoice & Delivery Challan Preview</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{previewInvoiceNum || ''}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setPreviewPdfUrl(null);
                                    setPreviewInvoiceNum(null);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        
                        {/* Modal Body: Embedded PDF */}
                        <div style={{ flex: 1, background: '#525659', display: 'flex', justifyContent: 'center', padding: '16px' }}>
                            <iframe 
                                src={`${previewPdfUrl}#toolbar=1`}
                                width="100%"
                                height="100%"
                                style={{ border: 'none', borderRadius: '4px', background: '#ffffff' }}
                                title="Invoice PDF"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Inline keyframe animation spin style helper */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function InvoiceActionButton({ invoice, onPay }: { invoice: Invoice, onPay: () => void }) {
    const isPaid = invoice.status === 'paid';
    const [isHovered, setIsHovered] = useState(false);
    
    if (isPaid) {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(22, 163, 74, 0.08)',
                color: '#16A34A',
                border: '1px solid rgba(22, 163, 74, 0.2)',
                borderRadius: '12px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
            }}>
                <CheckCircle size={14} /> Paid
            </div>
        );
    }
    
    const config = { label: '✓ Record Payment', icon: 'ti ti-cash', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.05)', border: 'rgba(22, 163, 74, 0.15)', hoverBg: 'rgba(22, 163, 74, 0.1)', hoverBorder: 'rgba(22, 163, 74, 0.3)' };

    return (
        <Can permission="invoices.pay">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onPay();
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    border: `1px solid ${isHovered ? config.hoverBorder : config.border}`,
                    color: config.color,
                    background: isHovered ? config.hoverBg : config.bg,
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    width: '100%',
                    justifyContent: 'center',
                    boxShadow: isHovered ? `0 4px 12px ${config.bg.replace('0.05', '0.2').replace('0.08', '0.2')}` : '0 2px 4px rgba(0,0,0,0.02)',
                    transform: isHovered ? 'translateY(-1px)' : 'none'
                }}
            >
                {config.label}
            </button>
        </Can>
    );
}

function InvoiceActionMenu({ invoice, onPreview, onDownload, onResendTelegram, onRegenerate, sendingTelegramId, regeneratingId }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, upward: false });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen) {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const upward = spaceBelow < 250 && spaceAbove > spaceBelow;
            
            setMenuPosition({ 
                top: upward ? rect.top : rect.bottom, 
                left: rect.right, 
                upward 
            });
        }
        setIsOpen(!isOpen);
    };

    const menuItems = [
        { type: 'section', label: 'Documents & Delivery' },
        { label: 'View PDF', icon: <Eye size={16} />, onClick: onPreview, show: !!invoice.pdf_url },
        { label: 'Download PDF', icon: <Download size={16} />, onClick: onDownload },
        { type: 'separator' },
        { type: 'section', label: 'Actions' },
        { 
            label: sendingTelegramId === invoice.id ? 'Sending...' : 'Resend Telegram', 
            icon: <Send size={16} style={{ opacity: sendingTelegramId === invoice.id ? 0.5 : 1 }} />, 
            onClick: onResendTelegram,
            disabled: sendingTelegramId === invoice.id
        },
        { 
            label: regeneratingId === invoice.id ? 'Regenerating...' : 'Regenerate PDF', 
            icon: <RefreshCw size={16} style={{ animation: regeneratingId === invoice.id ? 'spin 1.5s linear infinite' : 'none', opacity: regeneratingId === invoice.id ? 0.5 : 1 }} />, 
            onClick: onRegenerate,
            disabled: regeneratingId === invoice.id
        },
    ];

    return (
        <div className={styles.menuContainer} ref={menuRef}>
            <button 
                className={styles.moreBtn} 
                onClick={toggleMenu}
            >
                <MoreHorizontal size={18} />
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            key="action-menu"
                            className={styles.dropdown}
                            initial={{ opacity: 0, scale: 0.95, y: menuPosition.upward ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: menuPosition.upward ? 10 : -10 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{ 
                                position: 'fixed',
                                top: menuPosition.upward ? 'auto' : `${menuPosition.top + 8}px`,
                                bottom: menuPosition.upward ? `${window.innerHeight - menuPosition.top + 8}px` : 'auto',
                                left: `${menuPosition.left - 220}px`,
                                zIndex: 9999,
                                transformOrigin: menuPosition.upward ? 'bottom right' : 'top right',
                                padding: '8px 0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                border: '1px solid rgba(0,0,0,0.05)',
                                borderRadius: '12px'
                            }}
                        >
                            {menuItems.filter(item => item.show !== false).map((item, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} className={styles.separator} style={{ margin: '4px 0', borderTop: '1px solid #F3F4F6' }} />
                                ) : item.type === 'section' ? (
                                    <div key={idx} style={{ padding: '6px 16px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {item.label}
                                    </div>
                                ) : (
                                    <button 
                                        key={idx} 
                                        className={styles.menuItem} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!item.disabled) {
                                                item.onClick?.();
                                                setIsOpen(false);
                                            }
                                        }}
                                        disabled={item.disabled}
                                        style={{ color: item.color, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', background: 'transparent', cursor: item.disabled ? 'not-allowed' : 'pointer', fontSize: '13px', textAlign: 'left', fontWeight: 500, opacity: item.disabled ? 0.6 : 1 }}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                )
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
