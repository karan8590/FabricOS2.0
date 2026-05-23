'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import AdvancedFilter, { FilterDefinition, FilterRow } from '@/components/ui/AdvancedFilter';
import ViewingPeriodSelector from '@/components/ui/ViewingPeriodSelector';
import tableStyles from '@/components/ui/Table.module.css';
import { FileText, TrendingUp, TrendingDown, FileSpreadsheet, Receipt, Package, Search, Loader2 } from 'lucide-react';
import { formatCurrencySafe } from '@/lib/utils';

export default function GstReportPage() {
    const { user, loading: authLoading } = useAuth();
    


    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Period selector state (matches Orders/Invoices pages)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

    // Search & filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterRow[]>([]);
    const [availableFilters] = useState<FilterDefinition[]>([
        { id: 'customer', label: 'Customer', type: 'text' },
        { id: 'invoice', label: 'Invoice No', type: 'text' },
        { id: 'type', label: 'Transaction Type', type: 'select', options: [
            { value: 'sales', label: 'Sales (Output Tax)' },
            { value: 'purchases', label: 'Purchases (ITC)' },
        ]},
    ]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const arr = [];
        for (let y = currentYear; y >= currentYear - 3; y--) arr.push(y.toString());
        return ['All Years', ...arr];
    }, []);

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

    // Build legacy month string for API
    const month = useMemo(() => {
        if (selectedYear === 'All Years') return '';
        if (selectedMonth === 'all') return selectedYear;
        return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    }, [selectedYear, selectedMonth]);

    
    useEffect(() => {
        if (!authLoading && user) {
            fetchGstReport();
        }
    }, [month, user, authLoading]);

    const fetchGstReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/gst-report?month=${month}`);
            const data = await res.json();
            if (res.ok) {
                setReportData(data);
            }
        } catch (error) {
            console.error('Error fetching GST report:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const exportToCSV = () => {
        if (!reportData) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "SALES (OUTPUT TAX)\n";
        csvContent += "Date,Invoice Number,Customer,Taxable Value,CGST,SGST,IGST,Total Tax\n";
        reportData.sales.forEach((s: any) => {
            const dateStr = new Date(s.date * 1000).toLocaleDateString('en-IN');
            const totalTax = (s.cgst_amount || 0) + (s.sgst_amount || 0) + (s.igst_amount || 0);
            csvContent += `${dateStr},${s.invoice_number},"${s.customerName}",${s.taxable_amount || 0},${s.cgst_amount || 0},${s.sgst_amount || 0},${s.igst_amount || 0},${totalTax}\n`;
        });
        csvContent += "\n";
        csvContent += "PURCHASES (INPUT TAX CREDIT)\n";
        csvContent += "Date,Invoice Number,Supplier GSTIN,Vendor,Taxable Value,CGST,SGST,IGST,Total ITC\n";
        reportData.purchases.forEach((p: any) => {
            const dateStr = new Date(p.date * 1000).toLocaleDateString('en-IN');
            const gstAmount = p.gst_amount || 0;
            const cgst = p.gst_type === 'CGST_SGST' ? gstAmount / 2 : 0;
            const sgst = p.gst_type === 'CGST_SGST' ? gstAmount / 2 : 0;
            const igst = p.gst_type === 'IGST' ? gstAmount : 0;
            csvContent += `${dateStr},${p.invoice_no || ''},${p.supplier_gstin || ''},"${p.vendorName || p.category}",${p.taxable_amount || 0},${cgst},${sgst},${igst},${gstAmount}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `GST_Report_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const summary = reportData?.summary || {};
    const sales = reportData?.sales || [];
    const purchases = reportData?.purchases || [];

    // Apply client-side search & filters (must be before early returns — Rules of Hooks)
    const filteredSales = useMemo(() => {
        let result = sales;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter((s: any) =>
                s.customerName?.toLowerCase().includes(q) ||
                s.invoice_number?.toLowerCase().includes(q)
            );
        }
        activeFilters.forEach((f: FilterRow) => {
            if (f.fieldId === 'customer' && f.value) {
                result = result.filter((s: any) => s.customerName?.toLowerCase().includes(f.value.toLowerCase()));
            } else if (f.fieldId === 'invoice' && f.value) {
                result = result.filter((s: any) => s.invoice_number?.toLowerCase().includes(f.value.toLowerCase()));
            }
        });
        return result;
    }, [sales, searchTerm, activeFilters]);

    const filteredPurchases = useMemo(() => {
        let result = purchases;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter((p: any) =>
                (p.vendorName || p.category)?.toLowerCase().includes(q) ||
                p.supplier_gstin?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [purchases, searchTerm, activeFilters]);

    // Determine which sections to show based on type filter
    const typeFilter = activeFilters.find((f: FilterRow) => f.fieldId === 'type')?.value;
    const showSales = !typeFilter || typeFilter === 'sales';
    const showPurchases = !typeFilter || typeFilter === 'purchases';

    if (authLoading || (loading && !reportData)) {
        return (
            <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Loading GST Report...</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ height: '140px', background: 'var(--bg-secondary)', borderRadius: '16px', animation: 'pulse 2s infinite' }}></div>
                    ))}
                </div>
                <div style={{ height: '400px', background: 'var(--bg-secondary)', borderRadius: '16px', animation: 'pulse 2s infinite' }}></div>
            </div>
        );
    }

    if (!user || user.role === 'customer') {
        return <div style={{ padding: '24px' }}>Access Denied</div>;
    }


    const fmt = (val: number) => formatCurrencySafe(val || 0);
    const fmtNum = (val: number) => (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        GST Report
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Monthly Output Tax, Input Tax Credit (ITC), and Net GST Liability
                    </p>
                </div>
                <button className="action-btn-secondary" onClick={exportToCSV}>
                    <FileSpreadsheet size={16} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {/* Output Tax */}
                <Card>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759', flexShrink: 0 }}>
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output Tax (Sales)</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2', marginTop: '2px' }}>
                                    {fmt(summary?.output?.totalTax)}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-secondary)', paddingTop: '12px' }}>
                            <span>CGST: <strong style={{ color: 'var(--text-primary)' }}>{fmt(summary?.output?.cgst)}</strong></span>
                            <span>SGST: <strong style={{ color: 'var(--text-primary)' }}>{fmt(summary?.output?.sgst)}</strong></span>
                            <span>IGST: <strong style={{ color: 'var(--text-primary)' }}>{fmt(summary?.output?.igst)}</strong></span>
                        </div>
                    </div>
                </Card>

                {/* Input Tax */}
                <Card>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255, 59, 48, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30', flexShrink: 0 }}>
                                <TrendingDown size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input Tax Credit (ITC)</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2', marginTop: '2px' }}>
                                    {fmt(summary?.input?.totalTax)}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-secondary)', paddingTop: '12px' }}>
                            <span>CGST: <strong style={{ color: 'var(--text-primary)' }}>{fmt(summary?.input?.cgst)}</strong></span>
                            <span>SGST: <strong style={{ color: 'var(--text-primary)' }}>{fmt(summary?.input?.sgst)}</strong></span>
                            <span>IGST: <strong style={{ color: 'var(--text-primary)' }}>{fmt(summary?.input?.igst)}</strong></span>
                        </div>
                    </div>
                </Card>

                {/* Net Payable */}
                <Card>
                    <div style={{ padding: '20px', background: 'linear-gradient(135deg, var(--brand-primary, #4F46E5), var(--brand-secondary, #7C3AED))', borderRadius: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net GST Payable</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: 'white', lineHeight: '1.2', marginTop: '2px' }}>
                                    {fmt(summary?.liability?.netPayable)}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px' }}>
                            <span>CGST: <strong style={{ color: 'white' }}>{fmt(summary?.liability?.cgst)}</strong></span>
                            <span>SGST: <strong style={{ color: 'white' }}>{fmt(summary?.liability?.sgst)}</strong></span>
                            <span>IGST: <strong style={{ color: 'white' }}>{fmt(summary?.liability?.igst)}</strong></span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Controls Row — Search, Filter, Period (matches Orders/Invoices pages) */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ width: '260px' }}>
                    <Input
                        placeholder="Search customer, invoice, vendor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <AdvancedFilter
                    availableFilters={availableFilters}
                    onApply={(filters) => setActiveFilters(filters)}
                    activeFilters={activeFilters}
                    resultsCount={filteredSales.length + filteredPurchases.length}
                    resultsLabel="entries"
                />
                <ViewingPeriodSelector
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onChangeYear={setSelectedYear}
                    onChangeMonth={setSelectedMonth}
                    years={years}
                    months={months}
                    compact={true}
                />
            </div>

            {/* Sales Table */}
            {showSales && (
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(52, 199, 89, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
                        <Receipt size={16} />
                    </div>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Sales (Output Tax)
                    </h2>
                    <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', background: 'rgba(52, 199, 89, 0.12)', color: '#34C759', padding: '2px 8px', borderRadius: '20px' }}>
                        {filteredSales.length} entries
                    </span>
                </div>
                <div className={tableStyles.tableContainer}>
                <div style={{ overflowX: 'auto' }}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>Date</th>
                                <th className={tableStyles.th}>Invoice No</th>
                                <th className={tableStyles.th}>Customer</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>CGST (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>SGST (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>IGST (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>Total Tax (₹)</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={tableStyles.td} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No sales with GST found for this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((s: any) => {
                                    const totalTax = (s.cgst_amount || 0) + (s.sgst_amount || 0) + (s.igst_amount || 0);
                                    return (
                                        <tr key={s.id} className={tableStyles.tr}>
                                            <td className={tableStyles.td} style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(s.date)}</td>
                                            <td className={tableStyles.td}>
                                                <span style={{ fontWeight: '600', color: 'var(--brand-primary, #4F46E5)', fontSize: '13px' }}>{s.invoice_number}</span>
                                            </td>
                                            <td className={tableStyles.td} style={{ fontSize: '13px', fontWeight: '500' }}>{s.customerName}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{fmtNum(s.taxable_amount)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtNum(s.cgst_amount)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtNum(s.sgst_amount)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtNum(s.igst_amount)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#34C759' }}>{fmtNum(totalTax)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {filteredSales.length > 0 && (
                            <tfoot>
                                <tr style={{ background: 'var(--bg-grouped)', borderTop: '2px solid var(--border-primary)' }}>
                                    <td className={tableStyles.td} colSpan={3} style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Total</td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredSales.reduce((sum: number, s: any) => sum + (s.taxable_amount || 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredSales.reduce((sum: number, s: any) => sum + (s.cgst_amount || 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredSales.reduce((sum: number, s: any) => sum + (s.sgst_amount || 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredSales.reduce((sum: number, s: any) => sum + (s.igst_amount || 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px', color: '#34C759' }}>
                                        {fmtNum(filteredSales.reduce((sum: number, s: any) => sum + (s.cgst_amount || 0) + (s.sgst_amount || 0) + (s.igst_amount || 0), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
            </div>
            )}

            {/* Purchases Table */}
            {showPurchases && (
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 59, 48, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30' }}>
                        <Package size={16} />
                    </div>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Purchases &amp; Job Work (Input Tax Credit)
                    </h2>
                    <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', background: 'rgba(255, 59, 48, 0.12)', color: '#FF3B30', padding: '2px 8px', borderRadius: '20px' }}>
                        {filteredPurchases.length} entries
                    </span>
                </div>
                <div className={tableStyles.tableContainer}>
                <div style={{ overflowX: 'auto' }}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>Date</th>
                                <th className={tableStyles.th}>Vendor / Supplier</th>
                                <th className={tableStyles.th}>Supplier GSTIN</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>CGST (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>SGST (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>IGST (₹)</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>Total ITC (₹)</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={tableStyles.td} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No purchases with ITC claimed found for this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((p: any) => {
                                    const gstAmount = p.gst_amount || 0;
                                    const cgst = p.gst_type === 'CGST_SGST' ? gstAmount / 2 : 0;
                                    const sgst = p.gst_type === 'CGST_SGST' ? gstAmount / 2 : 0;
                                    const igst = p.gst_type === 'IGST' ? gstAmount : 0;
                                    return (
                                        <tr key={p.id} className={tableStyles.tr}>
                                            <td className={tableStyles.td} style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                                            <td className={tableStyles.td} style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{p.vendorName || p.category}</td>
                                            <td className={tableStyles.td}>
                                                {p.supplier_gstin ? (
                                                    <code style={{ fontSize: '12px', background: 'var(--bg-grouped)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{p.supplier_gstin}</code>
                                                ) : (
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>—</span>
                                                )}
                                            </td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{fmtNum(p.taxable_amount)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtNum(cgst)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtNum(sgst)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtNum(igst)}</td>
                                            <td className={tableStyles.td} style={{ textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#FF3B30' }}>{fmtNum(gstAmount)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {filteredPurchases.length > 0 && (
                            <tfoot>
                                <tr style={{ background: 'var(--bg-grouped)', borderTop: '2px solid var(--border-primary)' }}>
                                    <td className={tableStyles.td} colSpan={3} style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Total</td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredPurchases.reduce((sum: number, p: any) => sum + (p.taxable_amount || 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredPurchases.reduce((sum: number, p: any) => sum + (p.gst_type === 'CGST_SGST' ? (p.gst_amount || 0) / 2 : 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredPurchases.reduce((sum: number, p: any) => sum + (p.gst_type === 'CGST_SGST' ? (p.gst_amount || 0) / 2 : 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                        {fmtNum(filteredPurchases.reduce((sum: number, p: any) => sum + (p.gst_type === 'IGST' ? (p.gst_amount || 0) : 0), 0))}
                                    </td>
                                    <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px', color: '#FF3B30' }}>
                                        {fmtNum(filteredPurchases.reduce((sum: number, p: any) => sum + (p.gst_amount || 0), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
            </div>
            )}
        </div>
    );
}
