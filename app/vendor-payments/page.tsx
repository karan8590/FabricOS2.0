'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './VendorPayments.module.css';
import tableStyles from '@/components/ui/Table.module.css';
import actionBtnStyles from '@/components/orders/ProductionActionButton.module.css';
import AddVendorModal from '@/components/vendors/AddVendorModal';
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
import { celebrateSmall } from '@/lib/confetti';
import { formatCurrencySafe, calculatePaymentDueDate } from '@/lib/utils';

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
    work_type: 'embroidery' | 'dyeing' | 'FABRIC' | 'PRINTING INK' | 'PACKAGING' | 'ACCESSORIES' | 'EMBROIDERY MATERIAL' | 'OTHER';
    total_amount: number;
    amount_paid: number;
    balance: number;
    due_date: string;
    status: 'paid' | 'partial' | 'unpaid' | 'overdue';
    linked_job_cost_id: number | null;
    created_at: number;
    notes?: string;
    instalments: Instalment[];
    source?: string;
    
    // Dispatch properties
    dispatch_id?: number | null;
    dispatch_number?: string | null;
    challan_number?: string | null;
    vehicle_number?: string | null;
    driver_name?: string | null;
    route?: string | null;
    dispatch_date?: string | null;
    dispatch_status?: string | null;
}

const getWorkTypeDisplay = (type: string) => {
    switch(type) {
        case 'embroidery': return { label: 'Embroidery', className: styles.embroideryBadge };
        case 'dyeing': return { label: 'Dyeing', className: styles.dyeingBadge };
        case 'FABRIC': return { label: 'FABRIC', className: styles.fabricBadge };
        case 'PRINTING INK': return { label: 'PRINTING INK', className: styles.inkBadge };
        case 'PACKAGING': return { label: 'PACKAGING', className: styles.packagingBadge };
        case 'ACCESSORIES': return { label: 'ACCESSORIES', className: styles.accessoriesBadge };
        case 'EMBROIDERY MATERIAL': return { label: 'EMBROIDERY MATERIAL', className: styles.embroideryBadge };
        default: return { label: 'Other', className: styles.otherBadge };
    }
};

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
    const [expandedVendorName, setExpandedVendorName] = useState<string | null>(null);

    // Vendor Type Filter State
    const [activeVendorType, setActiveVendorType] = useState('All');

    // Action Menu Popover
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    // Modals visibility
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
    const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false);
    
    // Add Cost Form State
    const [addCostAmount, setAddCostAmount] = useState<number>(0);
    const [addCostNotes, setAddCostNotes] = useState('');
    const [savingCost, setSavingCost] = useState(false);

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

    // Add Vendor Modal State
    const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
    const [savingVendor, setSavingVendor] = useState(false);
    
    // Vendor Form Fields
    const [vendorName, setVendorName] = useState('');
    const [vendorType, setVendorType] = useState('Fabric Supplier');
    const [vendorPhone, setVendorPhone] = useState('');
    const [vendorAltPhone, setVendorAltPhone] = useState('');
    const [vendorEmail, setVendorEmail] = useState('');
    const [vendorGst, setVendorGst] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [vendorVehicleNumber, setVendorVehicleNumber] = useState('');
    const [vendorDriverName, setVendorDriverName] = useState('');
    const [vendorVehicleType, setVendorVehicleType] = useState('');
    const [vendorRoute, setVendorRoute] = useState('');
    
    const [vendorWorkCategory, setVendorWorkCategory] = useState('Embroidery');
    const [vendorRateType, setVendorRateType] = useState('');
    const [vendorPaymentTerms, setVendorPaymentTerms] = useState('');
    const [vendorUpi, setVendorUpi] = useState('');
    const [vendorBankName, setVendorBankName] = useState('');
    const [vendorAccountNum, setVendorAccountNum] = useState('');
    const [vendorIfsc, setVendorIfsc] = useState('');
    
    const [vendorNotes, setVendorNotes] = useState('');
    const [vendorIsActive, setVendorIsActive] = useState(true);

    // Edit Due Date Form State
    const [editDaysUntilDue, setEditDaysUntilDue] = useState('30');
    const [savingDueDate, setSavingDueDate] = useState(false);

    const calculatedEditDueDate = useMemo(() => {
        if (!selectedPayment) return '';
        const baseDate = new Date(selectedPayment.created_at * 1000);
        return calculatePaymentDueDate(parseInt(editDaysUntilDue) || 0, baseDate);
    }, [selectedPayment, editDaysUntilDue]);

    const displayEditDueDate = useMemo(() => {
        if (!calculatedEditDueDate) return '';
        const [year, month, day] = calculatedEditDueDate.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }, [calculatedEditDueDate]);

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

    // Format money as Indian Rupees using safe formatter
    const formatCurrency = formatCurrencySafe;

    // Helper: Due Date split styling and relative timing Left
    const getDaysRemaining = (dueDateStr: string, status: string) => {
        if (status === 'paid') return { text: 'Paid', color: '#34C759', bold: false };
        if (status === 'pending_cost') return { text: 'Pending Cost', color: '#F59E0B', bold: false };
        if (!dueDateStr) return { text: '-', color: 'var(--text-tertiary)', bold: false };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fix: Parse YYYY-MM-DD strictly as local midnight
        const [year, month, day] = dueDateStr.split('-').map(Number);
        const due = new Date(year, month - 1, day);
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
            // Fix: Parse YYYY-MM-DD strictly as local midnight
            const [year, month, day] = dateStr.split('-').map(Number);
            const d = new Date(year, month - 1, day);
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
        
        const now = new Date();
        const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        setPaymentDate(localDateStr);
        
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
            console.log(`Amount paying cannot exceed outstanding balance of ₹${selectedPayment.balance}`);
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
                if (selectedPayment.balance - payingAmount <= 0) {
                    celebrateSmall(`confetti_vendorpay_${selectedPayment.id}`);
                }
                // Silent success
                setIsPayModalOpen(false);
                fetchPaymentsData();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to record vendor payment.');
            }
        } catch (err) {
            console.error('Submit payment error:', err);
            console.log('An unexpected network error occurred.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleAddVendorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorName || !vendorPhone || !vendorWorkCategory) {
            console.log('Please fill out all required fields.');
            return;
        }

        try {
            setSavingVendor(true);
            const payload = {
                name: vendorName,
                contact: vendorPhone,
                altPhone: vendorAltPhone,
                email: vendorEmail,
                materialSupplied: vendorType === 'transport' ? 'Transport Services' : vendorWorkCategory,
                balance: 0,
                vendorType: vendorType,
                gstNo: vendorGst,
                address: vendorAddress,
                rateType: vendorRateType,
                paymentTerms: vendorPaymentTerms,
                upiId: vendorUpi,
                bankName: vendorBankName,
                accountNumber: vendorAccountNum,
                ifscCode: vendorIfsc,
                notes: vendorNotes,
                status: vendorIsActive ? 'active' : 'inactive',
                vehicleNumber: vendorVehicleNumber || null,
                driverName: vendorDriverName || null,
                vehicleType: vendorVehicleType || null,
                defaultRoute: vendorRoute || null
            };

            const res = await fetch('/api/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log('Vendor profile successfully created! ✓');
                setIsAddVendorModalOpen(false);
                
                // Clear state
                setVendorName('');
                setVendorPhone('');
                setVendorAltPhone('');
                setVendorEmail('');
                setVendorGst('');
                setVendorAddress('');
                setVendorRateType('');
                setVendorPaymentTerms('');
                setVendorUpi('');
                setVendorBankName('');
                setVendorAccountNum('');
                setVendorIfsc('');
                setVendorNotes('');
                setVendorVehicleNumber('');
                setVendorDriverName('');
                setVendorVehicleType('');
                setVendorRoute('');
                
                fetchVendorsList(); // Re-fetch all vendors to update UI
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to create vendor.');
            }
        } catch (err) {
            console.error('Vendor creation error:', err);
            console.log('Unexpected error creating vendor.');
        } finally {
            setSavingVendor(false);
        }
    };

    // Trigger Add Cost Modal
    const openAddCostModal = (payment: VendorPayment) => {
        setSelectedPayment(payment);
        setAddCostAmount(0);
        setAddCostNotes('');
        setIsAddCostModalOpen(true);
        setActiveMenuId(null);
    };

    // Submit Add Cost
    const handleAddCostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayment || addCostAmount <= 0) return;

        try {
            setSavingCost(true);
            const res = await fetch(`/api/vendor-payments/${selectedPayment.id}/transport-cost`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cost: addCostAmount, notes: addCostNotes })
            });

            if (res.ok) {
                setIsAddCostModalOpen(false);
                fetchPaymentsData();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to add cost.');
            }
        } catch (err) {
            console.error('Submit cost error:', err);
        } finally {
            setSavingCost(false);
        }
    };

    // Trigger Edit Due Date Modal
    const openEditDateModal = (payment: VendorPayment) => {
        setSelectedPayment(payment);
        
        // Calculate existing days diff
        const createdDate = new Date(payment.created_at * 1000);
        createdDate.setHours(0, 0, 0, 0);
        
        const [year, month, day] = payment.due_date.split('-').map(Number);
        const currentDueDate = new Date(year, month - 1, day);
        currentDueDate.setHours(0, 0, 0, 0);
        
        const diffTime = currentDueDate.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setEditDaysUntilDue(Math.max(0, diffDays).toString());
        setIsEditDateModalOpen(true);
        setActiveMenuId(null);
    };

    // Submit edited due date
    const handleEditDateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayment) return;

        try {
            setSavingDueDate(true);
            const res = await fetch(`/api/vendor-payments/${selectedPayment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ due_date: calculatedEditDueDate })
            });

            if (res.ok) {
                // Silent success - rely on UI refresh via fetchPayments()
                setIsEditDateModalOpen(false);
                fetchPaymentsData();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to save new due date.');
            }
        } catch (err) {
            console.error('Submit due date error:', err);
            console.log('Failed to update due date due to network error.');
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
            vendorType: string;
            payments: VendorPayment[];
            stats: {
                count: number;
                totalAmount: number;
                amountPaid: number;
                balance: number;
                overdueCount: number;
                lastPaymentDate: string | null;
            };
        }> = {};

        const mapWorkTypeToTab = (p: VendorPayment) => {
            const wt = (p.work_type || '').toUpperCase();
            if (p.source === 'dispatch_transport' || wt.includes('TRANSPORT')) return 'Transport';
            if (wt.includes('EMBROIDERY') || wt.includes('JOB WORK')) return 'Embroidery';
            if (wt.includes('DYEING')) return 'Dyeing';
            if (wt.includes('FABRIC')) return 'Fabric';
            if (wt.includes('INK')) return 'Ink';
            if (wt.includes('PRINTING')) return 'Printing';
            if (wt.includes('STITCHING')) return 'Stitching';
            if (wt.includes('PACKAGING')) return 'Packaging';
            return 'Other';
        };

        const mapVendorCategoryToTab = (vt: string) => {
            const vtc = (vt || '').toUpperCase();
            if (vtc.includes('TRANSPORT')) return 'Transport';
            if (vtc.includes('JOB WORK') || vtc.includes('EMBROIDERY')) return 'Embroidery';
            if (vtc.includes('DYEING')) return 'Dyeing';
            if (vtc.includes('FABRIC')) return 'Fabric';
            if (vtc.includes('INK')) return 'Ink';
            if (vtc.includes('PRINTING')) return 'Printing';
            if (vtc.includes('STITCHING')) return 'Stitching';
            if (vtc.includes('PACKAGING')) return 'Packaging';
            return 'Other';
        };

        const paymentsToProcess = activeVendorType === 'All' 
            ? sortedPayments 
            : sortedPayments.filter(p => mapWorkTypeToTab(p) === activeVendorType);

        paymentsToProcess.forEach(p => {
            const key = p.vendor_name;
            if (!groups[key]) {
                groups[key] = {
                    vendorId: p.vendor_id,
                    vendorName: p.vendor_name,
                    vendorPhone: p.vendor_phone,
                    vendorType: activeVendorType === 'All' ? mapWorkTypeToTab(p) : activeVendorType,
                    payments: [],
                    stats: { count: 0, totalAmount: 0, amountPaid: 0, balance: 0, overdueCount: 0, lastPaymentDate: null }
                };
            }

            groups[key].payments.push(p);
            groups[key].stats.count += 1;
            groups[key].stats.totalAmount += Number(p.total_amount || 0);
            groups[key].stats.amountPaid += Number(p.amount_paid || 0);
            groups[key].stats.balance += Number(p.balance || 0);
            if (p.status === 'overdue') {
                groups[key].stats.overdueCount += 1;
            }

            // Find latest payment date
            if (p.instalments && p.instalments.length > 0) {
                const latest = p.instalments.reduce((latestDate, inst) => {
                    return (!latestDate || new Date(inst.date) > new Date(latestDate)) ? inst.date : latestDate;
                }, groups[key].stats.lastPaymentDate || '');
                if (latest) groups[key].stats.lastPaymentDate = latest;
            }
        });

        // No longer injecting vendors without matching payments

        let result = Object.values(groups);
        return result.sort((a, b) => b.stats.balance - a.stats.balance);
    }, [sortedPayments, vendors, activeVendorType]);

    // Initialize all expanded by default - removed per new accordion logic
    useEffect(() => {
        // We start with none expanded
        setExpandedVendorName(null);
    }, [activeVendorType, activeFilter]);

    const toggleVendor = (vendorName: string) => {
        setExpandedVendorName(prev => prev === vendorName ? null : vendorName);
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
            <table className={tableStyles.table}>
                <thead className={tableStyles.thead}>
                    <tr>
                        <th className={tableStyles.th} onClick={() => handleSort('vendor_name')}>
                            <div className={styles.flexGap}>
                                Vendor {getSortIcon('vendor_name')}
                            </div>
                        </th>
                        <th className={tableStyles.th}>Order</th>
                        <th className={tableStyles.th}>Work Type</th>
                        <th className={tableStyles.th}>Delivery Details</th>
                        <th className={`${tableStyles.th} ${styles.sortable}`} onClick={() => handleSort('total_amount')} style={{ textAlign: 'right' }}>
                            <div className={styles.flexGap} style={{ justifyContent: 'flex-end' }}>
                                Amount {getSortIcon('total_amount')}
                            </div>
                        </th>
                        <th className={tableStyles.th}>Payment Progress</th>
                        <th className={`${tableStyles.th} ${styles.sortable}`} onClick={() => handleSort('balance')} style={{ textAlign: 'right' }}>
                            <div className={styles.flexGap} style={{ justifyContent: 'flex-end' }}>
                                Balance {getSortIcon('balance')}
                            </div>
                        </th>
                        <th className={`${tableStyles.th} ${styles.sortable}`} onClick={() => handleSort('due_date')}>
                            <div className={styles.flexGap}>
                                Due Date {getSortIcon('due_date')}
                            </div>
                        </th>
                        <th className={tableStyles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody className={tableStyles.tbody}>
                    {list.map((p) => {
                        const daysInfo = getDaysRemaining(p.due_date, p.status);
                        const progressPercent = Math.min(100, Math.max(0, (p.amount_paid / p.total_amount) * 100));
                        return (
                            <tr key={p.id} className={tableStyles.tr}>
                                {/* VENDOR */}
                                <td className={tableStyles.td}>
                                    <div className={styles.vendorCol}>
                                        <span className={styles.vendorName}>{p.vendor_name}</span>
                                        <span className={styles.vendorPhone}>{p.vendor_phone || 'No phone'}</span>
                                    </div>
                                </td>

                                {/* ORDER */}
                                <td className={tableStyles.td}>
                                    {p.order_id ? (
                                        <Link href={`/orders/${p.order_id}`} className={styles.orderLink}>
                                            #{p.order_number || p.order_id}
                                        </Link>
                                    ) : p.source === 'dispatch_transport' || (p.work_type === 'transport' && p.dispatch_id) ? (
                                        <span className={styles.orderLink} style={{ cursor: 'default' }}>
                                            {p.challan_number || p.dispatch_number || 'Dispatch'}
                                        </span>
                                    ) : (
                                        <span className={styles.manualBadge}>Manual</span>
                                    )}
                                </td>

                                {/* WORK TYPE */}
                                <td className={tableStyles.td}>
                                    {p.source === 'dispatch_transport' || p.work_type === 'transport' ? (
                                        <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontSize: '11px', fontWeight: 600 }}>Transport</span>
                                    ) : (
                                        <span className={getWorkTypeDisplay(p.work_type).className}>
                                            {getWorkTypeDisplay(p.work_type).label}
                                        </span>
                                    )}
                                </td>

                                {/* DELIVERY DETAILS */}
                                <td className={tableStyles.td}>
                                    {(p.source === 'dispatch_transport' || p.work_type === 'transport') && p.dispatch_id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {p.challan_number && (
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {p.challan_number}
                                                </span>
                                            )}
                                            {p.vehicle_number && (
                                                <span style={{ fontSize: '12px', fontWeight: p.challan_number ? 500 : 600, color: 'var(--text-primary)' }}>
                                                    {p.vehicle_number}
                                                </span>
                                            )}
                                            {p.driver_name && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {p.driver_name}
                                                </span>
                                            )}
                                            {p.route && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {p.route}
                                                </span>
                                            )}
                                            {p.dispatch_date && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {formatDueDate(p.dispatch_date)}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                                    )}
                                </td>

                                {/* AMOUNT */}
                                <td className={`${tableStyles.td} ${styles.amount}`} style={{ textAlign: 'right' }}>
                                    {(p.source === 'dispatch_transport' || (p.work_type || '').toLowerCase() === 'transport') && (!p.total_amount || p.total_amount <= 0) ? (
                                        <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: 600 }}>Cost Pending</span>
                                    ) : (
                                        formatCurrency(p.total_amount)
                                    )}
                                </td>

                                {/* PAYMENT PROGRESS */}
                                <td className={tableStyles.td}>
                                    {(p.source === 'dispatch_transport' || p.work_type === 'transport') && p.total_amount <= 0 ? (
                                        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '13px' }}>Awaiting Transport Cost</span>
                                    ) : (
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
                                    )}
                                </td>

                                {/* BALANCE */}
                                <td className={tableStyles.td} style={{ textAlign: 'right', fontWeight: '600', color: p.balance > 0 ? '#FF3B30' : 'var(--text-disabled)' }}>
                                    {(p.source === 'dispatch_transport' || p.work_type === 'transport') && p.total_amount <= 0 ? '—' : p.balance > 0 ? formatCurrency(p.balance) : '—'}
                                </td>

                                {/* DUE DATE */}
                                <td className={tableStyles.td}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{formatDueDate(p.due_date)}</span>
                                        <span style={{ fontSize: '11.5px', fontWeight: daysInfo.bold ? '600' : '500', color: daysInfo.color }}>
                                            {daysInfo.text}
                                        </span>
                                    </div>
                                </td>

                                {/* ACTIONS */}
                                <td className={tableStyles.td} style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {(p.source === 'dispatch_transport' || (p.work_type || '').toLowerCase() === 'transport') && (!p.total_amount || p.total_amount <= 0) ? (
                                            <button 
                                                className={`${actionBtnStyles.btn} ${actionBtnStyles.themeGhost}`}
                                                style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #E5E7EB' }}
                                                onClick={() => openAddCostModal(p)}
                                            >
                                                Add Cost
                                            </button>
                                        ) : p.status !== 'paid' && (
                                            <button 
                                                className={`${actionBtnStyles.btn} ${actionBtnStyles.themeIndigo}`}
                                                onClick={() => openPayModal(p)}
                                            >
                                                Pay
                                            </button>
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

    const renderMobileCards = (list: VendorPayment[]) => {
        return (
            <div className={`${styles.mobileCardsList} mobile-only`}>
                {list.map(p => {
                    const statusColor = p.payment_status === 'paid' ? '#34C759' : p.payment_status === 'partial' ? '#FF9500' : '#FF3B30';
                    return (
                        <div key={p.id} className={styles.mobileCard} style={{ borderLeftColor: statusColor }}>
                            <div className={styles.mobileCardTop}>
                                <div className={styles.mobileCardTitle}>
                                    {p.order_id ? `#${p.order_number || p.order_id}` : p.challan_number || p.dispatch_number || 'Dispatch'}
                                    <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>{p.work_type}</span>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrencySafe(p.total_amount)}</div>
                            </div>
                            <div className={styles.mobileCardMiddle}>
                                <div className={styles.mobileCardDesc}>
                                    Due: {formatDueDate(p.due_date)} • Qty: {p.quantity_meters}m
                                </div>
                                <div className={styles.mobileCardDesc} style={{ color: statusColor }}>
                                    Balance: {formatCurrencySafe(p.balance)}
                                </div>
                            </div>
                            <div className={styles.mobileCardAction}>
                                <button 
                                    className="action-btn-primary" 
                                    style={{ width: '100%', height: '32px', fontSize: '12px', background: p.balance <= 0 ? 'var(--bg-grouped)' : 'var(--bg-card-alt)', color: p.balance <= 0 ? 'var(--text-tertiary)' : 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                                    onClick={(e) => { e.stopPropagation(); handleRecordPayment(p); }}
                                >
                                    {p.balance > 0 ? 'Record Payment' : 'View History'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!isClient) return null;

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
                        setIsAddVendorModalOpen(true);
                    }}
                >
                    <Plus size={16} />
                    <span>Add Vendor</span>
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

            {/* Vendor Category Toggle */}
            <div className={styles.quickMonthTabs} style={{ marginTop: '24px', marginBottom: '16px' }}>
                {['All', 'Embroidery', 'Dyeing', 'Fabric', 'Ink', 'Printing', 'Stitching', 'Packaging', 'Transport', 'Other'].map(type => (
                    <button
                        key={type}
                        className={`${styles.quickMonthTab} ${activeVendorType === type ? styles.quickMonthTabActive : ''}`}
                        onClick={() => {
                            setActiveVendorType(type);
                            setExpandedVendorName(null);
                        }}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Loading vendor payments...</span>
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ height: '64px', background: 'var(--bg-secondary)', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
                    ))}
                </div>
            ) : sortedPayments.length === 0 ? (
                <div className={styles.tableCard} style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)' }}>
                    No outstanding payments match your current criteria.
                </div>
            ) : viewMode === 'flat' ? (
                <div className={styles.tableCard}>
                    <div className="desktop-only">{renderTable(sortedPayments)}</div>
                    {renderMobileCards(sortedPayments)}
                </div>
            ) : (
                <div className={styles.vendorGrid}>
                    {groupedSections.map((g) => {
                        const isExpanded = expandedVendorName === g.vendorName;
                        const progressPercent = Math.min(100, Math.max(0, (g.stats.amountPaid / g.stats.totalAmount) * 100)) || 0;
                        
                        return (
                            <React.Fragment key={g.vendorName}>
                                <div 
                                    className={`${styles.vendorCard} ${isExpanded ? styles.vendorCardActive : ''}`}
                                    onClick={() => toggleVendor(g.vendorName)}
                                >
                                    <div className={styles.vendorCardHeader}>
                                        <div>
                                            <div className={styles.vendorCardName}>{g.vendorName}</div>
                                            <div className={styles.vendorCardPhone}>{g.vendorPhone || 'No contact'}</div>
                                        </div>
                                        <div className={g.vendorType === 'Embroidery' ? styles.embroideryBadge : g.vendorType === 'Dyeing' ? styles.dyeingBadge : styles.manualBadge}>
                                            {g.vendorType}
                                        </div>
                                    </div>
                                    
                                    <div className={styles.vendorCardStats}>
                                        <div className={styles.vendorCardStatItem}>
                                            <span className={styles.vendorCardStatLabel}>Outstanding</span>
                                            <span className={`${styles.vendorCardStatValue} ${g.stats.balance > 0 ? styles.vendorCardAmount : ''}`}>
                                                {formatCurrency(g.stats.balance)}
                                            </span>
                                        </div>
                                        <div className={styles.vendorCardStatItem} style={{ alignItems: 'center' }}>
                                            <span className={styles.vendorCardStatLabel}>Bills</span>
                                            <span className={styles.vendorCardStatValue}>{g.stats.count}</span>
                                        </div>
                                        <div className={styles.vendorCardStatItem} style={{ alignItems: 'flex-end' }}>
                                            <span className={styles.vendorCardStatLabel}>Last Paid</span>
                                            <span className={styles.vendorCardStatValue} style={{ fontWeight: 500 }}>
                                                {g.stats.lastPaymentDate ? formatDueDate(g.stats.lastPaymentDate) : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.vendorCardFooter}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {g.stats.overdueCount > 0 && <span className={`${styles.summaryPill} ${styles.pillUrgent}`} style={{ padding: '2px 6px', fontSize: '10px' }}>Overdue</span>}
                                                {g.stats.balance > 0 && g.stats.amountPaid > 0 && <span className={`${styles.summaryPill} ${styles.pillWarning}`} style={{ padding: '2px 6px', fontSize: '10px' }}>Partial</span>}
                                                {g.stats.balance === 0 && <span className={styles.summaryPill} style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', borderColor: 'rgba(52, 199, 89, 0.2)' }}>Paid</span>}
                                                {g.stats.amountPaid === 0 && g.stats.balance > 0 && <span className={styles.summaryPill} style={{ padding: '2px 6px', fontSize: '10px' }}>Unpaid</span>}
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round(progressPercent)}% paid</span>
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
                                </div>
                                
                                {isExpanded && (
                                    <div className={styles.expandedRow}>
                                        <div className={styles.expandedPanelContainer}>
                                            <div className={styles.expandedPanelHeader}>
                                                <div className={styles.expandedPanelTitle}>
                                                    Vendor Details <span style={{ color: 'var(--text-tertiary)' }}>•</span> <span style={{ color: 'var(--accent)' }}>{g.vendorName}</span>
                                                </div>
                                                <div className={styles.expandedPanelStats}>
                                                    <div className={styles.expandedPanelStat}>
                                                        <span className={styles.expandedPanelSubtitle}>Outstanding:</span>
                                                        <span className={`${styles.expandedPanelStatValue} ${g.stats.balance > 0 ? styles.vendorCardAmount : ''}`}>{formatCurrency(g.stats.balance)}</span>
                                                    </div>
                                                    <div className={styles.expandedPanelStat}>
                                                        <span className={styles.expandedPanelSubtitle}>Invoices:</span>
                                                        <span className={styles.expandedPanelStatValue}>{g.stats.count}</span>
                                                    </div>
                                                    {g.stats.overdueCount > 0 && (
                                                        <div className={styles.expandedPanelStat}>
                                                            <span className={styles.expandedPanelSubtitle}>Overdue:</span>
                                                            <span className={styles.expandedPanelStatValue} style={{ color: '#FF3B30' }}>{g.stats.overdueCount}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.tableCard} style={{ margin: 0, border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                                                {g.payments.length === 0 ? (
                                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                        <p style={{ margin: 0, fontWeight: 500 }}>No active vendor payments</p>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Outstanding balance is zero.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="desktop-only">{renderTable(g.payments)}</div>
                                                        {renderMobileCards(g.payments)}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Pay Vendor Modal */}
            {isPayModalOpen && selectedPayment && (
                <div className={styles.modalOverlay} onClick={() => setIsPayModalOpen(false)}>
                    <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Pay Vendor — {selectedPayment.vendor_name}</h2>
                        <p className={styles.modalSubtitle}>
                            {selectedPayment.notes ? selectedPayment.notes : `${getWorkTypeDisplay(selectedPayment.work_type).label} outsourcing invoice for Order #${selectedPayment.order_number || selectedPayment.order_id}`}
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
                            <div className={styles.formFooter}>
                                <button type="button" className={styles.btnSecondary} onClick={() => setIsPayModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnPrimary} disabled={processingPayment || payingAmount <= 0}>
                                    {processingPayment ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Vendor Modal */}
            <AddVendorModal 
                isOpen={isAddVendorModalOpen}
                onClose={() => setIsAddVendorModalOpen(false)}
                onSuccess={() => {
                    setIsAddVendorModalOpen(false);
                    fetchVendorsList(); // Re-fetch all vendors to update UI
                }}
            />

            {/* Edit Due Date Modal */}
            {isEditDateModalOpen && selectedPayment && (
                <div className={styles.modalOverlay} onClick={() => setIsEditDateModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.mobileSheetHandle} />
                        <h2 className={styles.modalTitle}>Edit Due Date</h2>
                        <p className={styles.modalSubtitle}>Change payment target date for {selectedPayment.vendor_name}</p>

                        <form onSubmit={handleEditDateSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Days Until Due <span style={{color: '#FF3B30'}}>*</span></label>
                                <input 
                                    type="number"
                                    className={styles.formInput}
                                    value={editDaysUntilDue}
                                    min="0"
                                    onChange={(e) => setEditDaysUntilDue(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup} style={{ marginTop: '4px', marginBottom: '8px' }}>
                                <label className={styles.formLabel} style={{ color: 'var(--text-secondary)' }}>Payment Due On:</label>
                                <div style={{ 
                                    padding: '12px', 
                                    background: '#F9FAFB', 
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    color: '#4F46E5',
                                    fontSize: '14px'
                                }}>
                                    {displayEditDueDate}
                                </div>
                            </div>

                            <div className={styles.formFooter}>
                                <button type="button" className={styles.btnSecondary} onClick={() => setIsEditDateModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnPrimary} disabled={savingDueDate}>
                                    {savingDueDate ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Cost Modal */}
            {isAddCostModalOpen && selectedPayment && (
                <div className={styles.modalOverlay} onClick={() => setIsAddCostModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.mobileSheetHandle} />
                        <h2 className={styles.modalTitle}>Add Delivery Cost</h2>
                        <p className={styles.modalSubtitle}>Set the final transport bill for {selectedPayment.vendor_name}</p>

                        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Dispatch Challan</span>
                                <span style={{ fontWeight: 600 }}>{selectedPayment.challan_number || selectedPayment.dispatch_number || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Vehicle</span>
                                <span style={{ fontWeight: 600 }}>{selectedPayment.vehicle_number || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Driver</span>
                                <span style={{ fontWeight: 600 }}>{selectedPayment.driver_name || '—'}</span>
                            </div>
                        </div>

                        <form onSubmit={handleAddCostSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Delivery Cost (₹) <span style={{color: '#FF3B30'}}>*</span></label>
                                <input 
                                    type="number"
                                    className={styles.formInput}
                                    value={addCostAmount || ''}
                                    min="1"
                                    onChange={(e) => setAddCostAmount(parseFloat(e.target.value) || 0)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes / Bill Ref (Optional)</label>
                                <textarea 
                                    className={styles.formTextarea}
                                    style={{ height: '60px', resize: 'none' }}
                                    value={addCostNotes}
                                    onChange={(e) => setAddCostNotes(e.target.value)}
                                    placeholder="Enter bill number or details..."
                                />
                            </div>

                            <div className={styles.formFooter}>
                                <button type="button" className={styles.btnSecondary} onClick={() => setIsAddCostModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnPrimary} disabled={savingCost || addCostAmount <= 0}>
                                    {savingCost ? <Loader2 size={16} className="animate-spin" /> : 'Save Cost'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
