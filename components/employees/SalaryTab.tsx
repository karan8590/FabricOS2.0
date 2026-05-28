'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './SalaryTab.module.css';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import ViewingPeriodSelector from '@/components/ui/ViewingPeriodSelector';
import GroupedPeriodSection from '@/components/ui/GroupedPeriodSection';
import { celebrateMedium } from '@/lib/confetti';

interface Employee {
    id: number;
    name: string;
    role: string;
    monthlySalary?: number;
    is_active: number;
}

interface SalaryRecord {
    id: number | null;
    employeeId: number;
    name: string;
    role: string;
    monthlySalary: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    basicEarned: number;
    deductions: number;
    advanceRecovery: number;
    netPayable: number;
    status: 'paid' | 'unpaid';
    activeAdvanceId?: number | null;
    remainingBalance?: number;
}

interface SalaryTabProps {
    employees: Employee[];
}

export default function SalaryTab({ employees }: SalaryTabProps) {
    const getCurrentMonthString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
    const [selectedMonthState, setSelectedMonthState] = useState(() => (new Date().getMonth() + 1).toString());
    const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

    const years = useMemo(() => {
        const currentYearStr = new Date().getFullYear().toString();
        return ['All Years', '2026', '2025', '2024'];
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

    const selectedMonth = useMemo(() => {
        if (selectedYear === 'All Years' || selectedMonthState === 'all') {
            return getCurrentMonthString();
        }
        return `${selectedYear}-${selectedMonthState.padStart(2, '0')}`;
    }, [selectedYear, selectedMonthState]);

    const [records, setRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [calculating, setCalculating] = useState<boolean>(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string>('');

    // Modal state for paying salary
    const [payModalOpen, setPayModalOpen] = useState<boolean>(false);
    const [payingRecord, setPayingRecord] = useState<SalaryRecord | null>(null);
    const [payRecovery, setPayRecovery] = useState<string>('0');
    const [payMode, setPayMode] = useState<string>('Cash');
    const [payReference, setPayReference] = useState<string>('');
    const [payDate, setPayDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    useEffect(() => {
        fetchSalaries();
    }, [selectedYear, selectedMonthState]);

    const fetchSalaries = async () => {
        setLoading(true);
        try {
            if (selectedYear !== 'All Years' && selectedMonthState !== 'all') {
                // Fetch single month
                const mStr = `${selectedYear}-${selectedMonthState.padStart(2, '0')}`;
                const res = await fetch(`/api/salaries?month=${mStr}`);
                if (res.ok) {
                    const data = await res.json();
                    const activeEmployees = employees.filter(e => e.is_active === 1);
                    const backendMap = new Map((data.records || []).map((r: any) => [r.employeeId, r]));

                    const tagged = activeEmployees.map(emp => {
                        const r = backendMap.get(emp.id) || {
                            id: null,
                            employeeId: emp.id,
                            name: emp.name,
                            role: emp.role,
                            monthlySalary: emp.monthlySalary || 0,
                            workingDays: data.totalDays || 30,
                            presentDays: 0,
                            absentDays: 0,
                            halfDays: 0,
                            basicEarned: 0,
                            deductions: 0,
                            advanceRecovery: 0,
                            netPayable: 0,
                            status: 'unpaid'
                        };
                        return {
                            ...r,
                            monthVal: parseInt(selectedMonthState),
                            yearVal: parseInt(selectedYear)
                        };
                    });
                    setRecords(tagged);
                }
            } else {
                // Fetch multiple months (either specific year + all months, or all years + all months)
                const yearsToFetch = selectedYear === 'All Years' ? ['2026', '2025', '2024'] : [selectedYear];
                const monthsToFetch = selectedMonthState === 'all' 
                    ? Array.from({ length: 12 }, (_, i) => (i + 1).toString())
                    : [selectedMonthState];

                const fetchPromises: Promise<any>[] = [];
                yearsToFetch.forEach(y => {
                    monthsToFetch.forEach(m => {
                        const mStr = `${y}-${m.padStart(2, '0')}`;
                        fetchPromises.push(
                            fetch(`/api/salaries?month=${mStr}`)
                                .then(res => res.ok ? res.json() : { records: [] })
                                .then(data => ({
                                    records: data.records || [],
                                    monthVal: parseInt(m),
                                    yearVal: parseInt(y)
                                }))
                        );
                    });
                });

                const results = await Promise.all(fetchPromises);
                const activeEmployees = employees.filter(e => e.is_active === 1);
                const allRecords: SalaryRecord[] = [];
                results.forEach(res => {
                    const backendMap = new Map((res.records || []).map((r: any) => [r.employeeId, r]));
                    activeEmployees.forEach(emp => {
                        const r = backendMap.get(emp.id) || {
                            id: null,
                            employeeId: emp.id,
                            name: emp.name,
                            role: emp.role,
                            monthlySalary: emp.monthlySalary || 0,
                            workingDays: 30, // Fallback, real totalDays should come from backend ideally
                            presentDays: 0,
                            absentDays: 0,
                            halfDays: 0,
                            basicEarned: 0,
                            deductions: 0,
                            advanceRecovery: 0,
                            netPayable: 0,
                            status: 'unpaid'
                        };
                        allRecords.push({
                            ...r,
                            monthVal: res.monthVal,
                            yearVal: res.yearVal
                        });
                    });
                });
                setRecords(allRecords);
            }
        } catch (error) {
            console.error('Failed to fetch salaries:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRowNetPayable = (rec: SalaryRecord) => {
        if (rec.status === 'paid') {
            return rec.netPayable;
        }
        return Math.max(0, Number((rec.basicEarned - rec.deductions).toFixed(2)));
    };

    const groupedRecords = useMemo(() => {
        const groups: Record<string, {
            month: number;
            year: number;
            monthName: string;
            records: SalaryRecord[];
            totalPaid: number;
            pending: number;
            deductions: number;
            recoveries: number;
        }> = {};

        records.forEach(r => {
            const m = (r as any).monthVal || parseInt(selectedMonth.split('-')[1]);
            const y = (r as any).yearVal || parseInt(selectedMonth.split('-')[0]);
            const key = `${m}-${y}`;

            if (!groups[key]) {
                const date = new Date(y, m - 1);
                groups[key] = {
                    month: m,
                    year: y,
                    monthName: date.toLocaleString('default', { month: 'long' }),
                    records: [],
                    totalPaid: 0,
                    pending: 0,
                    deductions: 0,
                    recoveries: 0
                };
            }

            groups[key].records.push(r);
            if (r.status === 'paid') {
                groups[key].totalPaid += r.netPayable;
            } else {
                groups[key].pending += getRowNetPayable(r);
            }
            groups[key].deductions += r.deductions;
            groups[key].recoveries += r.status === 'paid' ? r.advanceRecovery : 0;
        });

        return Object.values(groups).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [records, selectedMonth]);

    const handleCalculateSalaries = async () => {
        if (records.length === 0) {
            setSaveStatus('error');
            setMessage('No active employees found to generate salaries.');
            return;
        }

        setCalculating(true);
        setSaveStatus('idle');
        setMessage('');

        try {
            // Bulk save all edited rows into database
            const saveRes = await fetch('/api/salaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_all',
                    month: selectedMonth,
                    records: records.map(r => ({
                        ...r,
                        advanceRecovery: r.status === 'paid' ? r.advanceRecovery : 0,
                        netPayable: r.status === 'paid' ? r.netPayable : Math.max(0, Number((r.basicEarned - r.deductions).toFixed(2)))
                    }))
                })
            });

            if (saveRes.ok) {
                setSaveStatus('success');
                setMessage('Salaries calculated and saved successfully!');
                fetchSalaries();
            } else {
                const saveErr = await saveRes.json();
                setSaveStatus('error');
                setMessage(saveErr.error || 'Failed to save calculated salaries');
            }
        } catch (error) {
            console.error('Failed to calculate salaries:', error);
            setSaveStatus('error');
            setMessage('Network error, failed to calculate salaries');
        } finally {
            setCalculating(false);
            setTimeout(() => {
                setSaveStatus('idle');
                setMessage('');
            }, 3000);
        }
    };

    const handleMarkAsPaid = (employeeId: number) => {
        const rec = records.find(r => r.employeeId === employeeId);
        if (rec) {
            setPayingRecord(rec);
            setPayRecovery('0');
            setPayMode('Cash');
            setPayReference('');
            const today = new Date();
            setPayDate(today.toISOString().split('T')[0]);
            setPayModalOpen(true);
        }
    };

    const handleConfirmPayment = async () => {
        if (!payingRecord) return;
        setCalculating(true);
        try {
            const payingSubtotal = Math.max(0, Number((payingRecord.basicEarned - payingRecord.deductions).toFixed(2)));
            const maxRecovery = Math.min(payingRecord.remainingBalance || 0, payingSubtotal);
            const numericRecovery = Math.max(0, Math.min(Number(payRecovery) || 0, maxRecovery));

            const res = await fetch('/api/salaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_paid',
                    month: selectedMonth,
                    employeeId: payingRecord.employeeId,
                    paymentMode: payMode,
                    reference: payReference,
                    paymentDate: payDate,
                    advanceRecovery: numericRecovery
                })
            });

            if (res.ok) {
                setSaveStatus('success');
                setMessage(`Salary for ${payingRecord.name} marked as paid successfully.`);
                
                const isAllPaid = records.filter(r => r.employeeId !== payingRecord.employeeId).every(r => r.status === 'paid');
                if (isAllPaid) {
                    celebrateMedium(`confetti_salaries_${selectedMonth}`);
                    setTimeout(() => setMessage(`All salaries for this month have been paid!`), 100);
                }

                setPayModalOpen(false);
                setPayingRecord(null);
                setPayRecovery('0');
                setPayReference('');
                
                // Reload list from database
                await fetchSalaries();
            } else {
                const data = await res.json();
                setSaveStatus('error');
                setMessage(data.error || 'Failed to confirm payment.');
            }
        } catch (error) {
            console.error('Payment confirmation failed:', error);
            setSaveStatus('error');
            setMessage('Network error, failed to confirm payment.');
        } finally {
            setCalculating(false);
            setTimeout(() => {
                setSaveStatus('idle');
                setMessage('');
            }, 4000);
        }
    };

    const handleExportExcel = () => {
        if (records.length === 0) return;

        const data = records.map(r => ({
            'Employee Name': r.name,
            'Role': r.role.toUpperCase(),
            'Base Monthly Salary (₹)': r.monthlySalary,
            'Total Month Days': r.workingDays,
            'Present Days': r.presentDays,
            'Absent Days': r.absentDays,
            'Basic Earned (₹)': r.basicEarned,
            'Deductions (₹)': r.deductions,
            'Advance Recovery (₹)': r.status === 'paid' ? r.advanceRecovery : 0,
            'Net Payable (₹)': getRowNetPayable(r),
            'Status': r.status.toUpperCase()
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
        
        // Auto fit columns
        const maxLens = Object.keys(data[0] || {}).map(key => 
            Math.max(key.length, ...data.map(row => String((row as any)[key] || '').length))
        );
        worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));

        XLSX.writeFile(workbook, `Salary_Report_${selectedMonth}.xlsx`);
    };

    const downloadSalarySlip = (record: SalaryRecord) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Brand Design
        const primaryColor = [37, 99, 235]; // Royal blue #2563EB
        const textPrimary = [17, 24, 39]; // Off-black #111827
        const textSecondary = [107, 114, 128]; // Muted Grey #6B7280
        const borderLight = [229, 231, 235]; // Separator #E5E7EB

        // Top Header Accent Bar
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 15, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('FABRICOS MANUFACTURING UNIT', 15, 10);

        // Header Title
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(18);
        doc.text('EMPLOYEE SALARY SLIP', 15, 30);
        
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.8);
        doc.line(15, 33, 195, 33);

        // Employee and Month Metadata
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Employee Name:', 15, 43);
        doc.setFont('helvetica', 'normal');
        doc.text(record.name, 50, 43);

        doc.setFont('helvetica', 'bold');
        doc.text('Designation:', 15, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(record.role.charAt(0).toUpperCase() + record.role.slice(1), 50, 50);

        doc.setFont('helvetica', 'bold');
        doc.text('Pay Period:', 120, 43);
        doc.setFont('helvetica', 'normal');
        const [y, m] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1);
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        doc.text(monthName, 155, 43);

        doc.setFont('helvetica', 'bold');
        doc.text('Calendar Days:', 120, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(`${record.workingDays} Days`, 155, 50);

        // Separator
        doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
        doc.setLineWidth(0.3);
        doc.line(15, 56, 195, 56);

        // Attendance Stats Section
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance & Work Summary', 15, 64);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Days Present: ${record.presentDays}`, 15, 71);
        doc.text(`Days Absent: ${record.absentDays}`, 75, 71);

        doc.line(15, 83, 195, 83);

        // Earnings and Deductions Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Financial Components breakdown', 15, 91);
        doc.text('Amount (INR)', 155, 91);
        doc.line(15, 94, 195, 94);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        let yPos = 101;
        const addRow = (label: string, value: number, isDeduction = false) => {
            doc.text(label, 15, yPos);
            const prefix = isDeduction ? '-' : '+';
            doc.text(`${prefix} Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 155, yPos);
            yPos += 7;
        };

        addRow('Base Salary (Fixed Monthly Rate)', record.monthlySalary);
        addRow('Basic Pro-rata Salary Earned', record.basicEarned);
        const displayRecovery = record.status === 'paid' ? record.advanceRecovery : 0;
        const displayNet = getRowNetPayable(record);

        addRow('Deductions (Unpaid Absences)', record.deductions, true);
        addRow('Advance Salary Recovery', displayRecovery, true);

        doc.line(15, yPos - 3, 195, yPos - 3);

        // Bold Net Payable Box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('NET DISBURSED AMOUNT', 15, yPos + 3);
        doc.text(`Rs. ${displayNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 155, yPos + 3);

        // Blue accent surrounding boundary box
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(12, yPos - 3, 186, 9);

        // Signature Sections
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        doc.line(20, 245, 75, 245);
        doc.text("Employee's Signature", 28, 250);

        doc.line(135, 245, 190, 245);
        doc.text("Authorized Signatory", 143, 250);

        // Save file triggers browser download
        doc.save(`SalarySlip_${record.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
    };

    const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

    const hasUnsavedChanges = records.some(r => r.id === null);

    return (
        <div className={styles.tabContainer}>
            {/* Top Toolbar */}
            <div className={styles.headerRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <ViewingPeriodSelector
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonthState}
                    onChangeYear={setSelectedYear}
                    onChangeMonth={setSelectedMonthState}
                    years={years}
                    months={months}
                    compact={true}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className={`${styles.btnAction} ${styles.btnPrimary}`}
                            onClick={handleCalculateSalaries}
                            disabled={calculating || records.length === 0}
                        >
                            {calculating ? (
                                <>
                                    <span className="spinner" /> Calculating...
                                </>
                            ) : (
                                'Calculate Salaries'
                            )}
                        </button>
                        {records.length > 0 && (
                            <button
                                className={`${styles.btnAction} ${styles.btnSecondary}`}
                                onClick={handleExportExcel}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                </svg>
                                Export to Excel
                            </button>
                        )}
                    </div>
            </div>

            {message && (
                <div className={`${styles.alertMessage} ${saveStatus === 'success' ? styles.alertSuccess : styles.alertError}`}>
                    {message}
                </div>
            )}

            {hasUnsavedChanges && (
                <div
                    style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 149, 0, 0.12)',
                        border: '1px solid rgba(255, 149, 0, 0.25)',
                        color: '#FF9500',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '20px'
                    }}
                >
                    ⚠️ You are viewing dynamically generated previews. Click &apos;Calculate Salaries&apos; to save these records to database.
                </div>
            )}

            {loading ? (
                <div className={styles.loadingState}>
                    Generating salary sheets...
                </div>
            ) : employees.filter(e => e.is_active === 1).length === 0 ? (
                <div className={styles.emptyStateCard}>
                    <h3 className={styles.emptyStateTitle}>No Employees Found</h3>
                    <p className={styles.emptyStateText}>
                        There are no active staff members in the system to calculate payroll. Add employees first in the team grid.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {groupedRecords.map((group) => {
                        const key = `${group.month}-${group.year}`;
                        const currentMonthKey = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
                        const isExpanded = collapsedMonths[key] !== undefined 
                            ? !collapsedMonths[key] 
                            : key === currentMonthKey;

                        const metrics: any[] = [
                            { value: group.records.length.toString(), label: 'employees', type: 'neutral' },
                            { value: `₹${group.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, label: 'paid', type: 'success' }
                        ];
                        if (group.pending > 0) {
                            metrics.push({ value: `₹${group.pending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, label: 'pending', type: 'warning' });
                        }
                        if (group.deductions > 0) {
                            metrics.push({ value: `₹${group.deductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, label: 'deductions', type: 'urgent' });
                        }
                        if (group.recoveries > 0) {
                            metrics.push({ value: `₹${group.recoveries.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, label: 'recoveries', type: 'success' });
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
                                {/* Desktop View */}
                                <div className={styles.tableCard} style={{ marginTop: '0' }}>
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.salaryTable}>
                                            <thead>
                                                <tr>
                                                    <th>Employee</th>
                                                    <th>Working Days</th>
                                                    <th>Present</th>
                                                    <th>Absent</th>
                                                    <th>Basic Earned</th>
                                                    <th>Deductions</th>
                                                    <th>Net Payable</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.records.map(rec => (
                                                    <tr key={rec.employeeId}>
                                                        <td>
                                                            <div className={styles.employeeCell}>
                                                                <div className={styles.avatar}>
                                                                    {rec.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <span className={styles.employeeName}>{rec.name}</span>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                        {formatRole(rec.role)} (₹{rec.monthlySalary}/mo)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={styles.numCell}>{rec.workingDays}</td>
                                                        <td className={styles.numCell} style={{ color: '#34C759', fontWeight: 600 }}>{rec.presentDays}</td>
                                                        <td className={styles.numCell} style={{ color: '#FF3B30', fontWeight: 600 }}>{rec.absentDays}</td>
                                                        <td className={styles.numCell}>₹{rec.basicEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        <td className={styles.numCell} style={{ color: '#FF3B30' }}>₹{rec.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        <td className={`${styles.numCell} ${styles.boldNum}`}>₹{getRowNetPayable(rec).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        <td>
                                                            <span className={`${styles.badge} ${rec.status === 'paid' ? styles.badgePaid : styles.badgeUnpaid}`}>
                                                                {rec.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className={styles.rowActions}>
                                                                {rec.status === 'unpaid' && (
                                                                    <button
                                                                        className={styles.btnPayRow}
                                                                        onClick={() => handleMarkAsPaid(rec.employeeId)}
                                                                    >
                                                                        Mark as Paid
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className={styles.btnSlipRow}
                                                                    onClick={() => downloadSalarySlip(rec)}
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                                                    </svg>
                                                                    Slip
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mobile Card List View */}
                                <div className={styles.mobileCardsContainer}>
                                    {group.records.map(rec => (
                                        <div key={rec.employeeId} className={styles.mobileCard}>
                                            <div className={styles.cardHeader}>
                                                <div className={styles.employeeCell}>
                                                    <div className={styles.avatar}>
                                                        {rec.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className={styles.employeeName}>{rec.name}</span>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                            {formatRole(rec.role)} (₹{rec.monthlySalary}/mo)
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`${styles.badge} ${rec.status === 'paid' ? styles.badgePaid : styles.badgeUnpaid}`}>
                                                    {rec.status}
                                                </span>
                                            </div>

                                            <div className={styles.cardRow}>
                                                <span className={styles.cardLabel}>Attendance</span>
                                                <span className={styles.cardValue} style={{ fontSize: '12px' }}>
                                                    Days: {rec.presentDays} Present | {rec.absentDays} Absent
                                                </span>
                                            </div>

                                            <div className={styles.cardRow}>
                                                <span className={styles.cardLabel}>Basic Salary Earned</span>
                                                <span className={styles.cardValue}>₹{rec.basicEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className={styles.cardRow}>
                                                <span className={styles.cardLabel}>Deductions (Absences)</span>
                                                <span className={styles.cardValue} style={{ color: '#FF3B30' }}>
                                                    -₹{rec.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className={styles.cardRow}>
                                                <span className={styles.cardLabel}>Net Disbursed Amount</span>
                                                <span className={styles.cardValue} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '15px' }}>
                                                    ₹{getRowNetPayable(rec).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className={styles.cardActions}>
                                                {rec.status === 'unpaid' && (
                                                    <button
                                                        className={styles.btnPayRow}
                                                        onClick={() => handleMarkAsPaid(rec.employeeId)}
                                                    >
                                                        Mark as Paid
                                                    </button>
                                                )}
                                                <button
                                                    className={styles.btnSlipRow}
                                                    onClick={() => downloadSalarySlip(rec)}
                                                >
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                                    </svg>
                                                    Download Slip
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GroupedPeriodSection>
                        );
                    })}
                </div>
            )}

            {/* Pay Salary Modal Popup */}
            {payModalOpen && payingRecord && (() => {
                const payingSubtotal = Math.max(0, Number((payingRecord.basicEarned - payingRecord.deductions).toFixed(2)));
                const maxRecovery = Math.min(payingRecord.remainingBalance || 0, payingSubtotal);
                
                const enteredRecovery = parseFloat(payRecovery) || 0;
                const numericRecovery = Math.max(0, Math.min(enteredRecovery, maxRecovery));
                const finalNetPayable = Math.max(0, Number((payingSubtotal - numericRecovery).toFixed(2)));

                return (
                    <div className={styles.modalBackdrop} onClick={() => setPayModalOpen(false)}>
                        <div className="global-modal-content" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className={styles.modalHeader}>
                                <div className={styles.avatarLarge}>
                                    {payingRecord.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.headerTitleGroup}>
                                    <span className={styles.modalTitleText}>Pay Salary</span>
                                    <span className={styles.modalSubtitleText}>{payingRecord.name} • {formatRole(payingRecord.role)}</span>
                                </div>
                            </div>

                            {/* Body */}
                            <div className={styles.modalBody}>
                                {/* SECTION 1: Salary Summary (Read Only) */}
                                <div className={styles.modalSection}>
                                    <span className={styles.sectionTitle}>Salary Summary</span>
                                    <div className={styles.summaryGrid}>
                                        <div className={styles.summaryRow}>
                                            <span>Basic Earned:</span>
                                            <span>₹{payingRecord.basicEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className={styles.summaryRow}>
                                            <span>Deductions:</span>
                                            <span style={{ color: '#FF3B30' }}>-₹{payingRecord.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className={styles.summaryRowBold}>
                                            <span>Subtotal:</span>
                                            <span>₹{payingSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>

                                 {/* SECTION 2: Advance Recovery */}
                                 {(payingRecord.remainingBalance ?? 0) > 0 && (
                                     <div className={styles.modalSection}>
                                        <span className={styles.sectionTitle}>Advance Recovery</span>
                                        <div className={styles.infoBox}>
                                            <span className={styles.infoIcon}>⚠️</span>
                                            <span>
                                                This employee has an outstanding advance of <strong>₹{(payingRecord.remainingBalance || 0).toLocaleString('en-IN')}</strong>.
                                            </span>
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label htmlFor="payRecoveryInput" className={styles.inputLabel}>Recover from this salary (₹)</label>
                                            <input
                                                id="payRecoveryInput"
                                                type="number"
                                                className={styles.formInput}
                                                min="0"
                                                max={maxRecovery}
                                                value={payRecovery}
                                                onChange={(e) => {
                                                    const rawVal = e.target.value;
                                                    setPayRecovery(rawVal);
                                                }}
                                                onBlur={() => {
                                                    const floatVal = parseFloat(payRecovery) || 0;
                                                    const capped = Math.max(0, Math.min(floatVal, maxRecovery));
                                                    setPayRecovery(String(capped));
                                                }}
                                                placeholder="0.00"
                                            />
                                            <span className={styles.helperText}>Leave 0 to skip recovery this month</span>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 3: Final Calculation */}
                                <div className={styles.modalSection}>
                                    <span className={styles.sectionTitle}>Calculation Details</span>
                                    <div className={styles.finalCalcCard}>
                                        <div className={styles.calcRow}>
                                            <span className={styles.calcLabel}>Salary Subtotal:</span>
                                            <span className={styles.calcValue}>₹{payingSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {numericRecovery > 0 && (
                                            <div className={styles.calcRow}>
                                                <span className={styles.calcLabel}>Advance Recovery:</span>
                                                <span className={`${styles.calcValue} ${styles.calcValueRed}`}>-₹{numericRecovery.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className={styles.divider} />
                                        <div className={styles.calcRow}>
                                            <span className={styles.netPayableLabel}>Net Payable:</span>
                                            <span className={styles.netPayableValue}>₹{finalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 4: Payment Details */}
                                <div className={styles.modalSection}>
                                    <span className={styles.sectionTitle}>Payment Details</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div className={styles.inputGroup}>
                                            <label htmlFor="payModeSelect" className={styles.inputLabel}>Payment Mode</label>
                                            <select
                                                id="payModeSelect"
                                                className={styles.formInput}
                                                value={payMode}
                                                onChange={(e) => setPayMode(e.target.value)}
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="NEFT">NEFT</option>
                                                <option value="RTGS">RTGS</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="UPI">UPI</option>
                                            </select>
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label htmlFor="payReferenceInput" className={styles.inputLabel}>Reference / UTR Number</label>
                                            <input
                                                id="payReferenceInput"
                                                type="text"
                                                className={styles.formInput}
                                                placeholder="Enter transaction reference (optional)"
                                                value={payReference}
                                                onChange={(e) => setPayReference(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label htmlFor="payDateInput" className={styles.inputLabel}>Payment Date</label>
                                            <input
                                                id="payDateInput"
                                                type="date"
                                                className={styles.formInput}
                                                value={payDate}
                                                onChange={(e) => setPayDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setPayModalOpen(false)}
                                    disabled={calculating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnConfirm}
                                    onClick={handleConfirmPayment}
                                    disabled={calculating}
                                >
                                    {calculating ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
