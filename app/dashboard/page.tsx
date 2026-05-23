'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import StatWidget from '@/components/ui/StatWidget';
import {
    ShoppingBag,
    FileText,
    TrendingUp,
    AlertCircle,
    Calendar,
    RefreshCw,
    ArrowRight,
    Users,
    Package,
    Box,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { celebrateMedium } from '@/lib/confetti';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import styles from './Dashboard.module.css';

// Rupee formatter matching ERP custom style
const formatRupee = (value: number) => {
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
};

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [formattedDate, setFormattedDate] = useState('');

    const fetchStats = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        
        setError(null);
        try {
            const res = await fetch('/api/dashboard/stats?year=2026&month=5');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to fetch dashboard metrics');
            }
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
            setError('Could not connect to database services.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (user && user.isSuperAdmin) {
            router.push('/super-admin');
            return;
        }

        fetchStats();
        
        // Format today's date elegantly matching the Orders header date style
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        };
        setFormattedDate(new Date().toLocaleDateString('en-GB', options));
    }, [fetchStats]);

    if (loading) {
        return (
            <div className={styles.dashboardPage}>
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-4 w-72 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                </div>

                {/* Grid Skeletons */}
                <div className={styles.widgetRow}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-bg-surface rounded-2xl border border-slate-100 shadow-sm animate-pulse"></div>
                    ))}
                </div>

                <div className={styles.gridRowDouble}>
                    <div className={styles.skeletonCard}></div>
                    <div className={styles.skeletonCard}></div>
                </div>
            </div>
        );
    }

    // Safely extract metrics
    const ordersReceived = stats?.ordersReceived?.value || 0;
    const ordersReceivedChange = stats?.ordersReceived?.change || 0;
    
    const ordersDelivered = stats?.ordersDelivered?.value || 0;
    const ordersDeliveredChange = stats?.ordersDelivered?.change || 0;
    
    const revenueCollected = stats?.revenueCollected?.value || 0;
    const revenueCollectedChange = stats?.revenueCollected?.change || 0;
    
    const outstandingAmount = stats?.outstandingAmount?.value || 0;
    const outstandingAmountChange = stats?.outstandingAmount?.change || 0;

    useEffect(() => {
        if (revenueCollected > 10000000) {
            // Trigger confetti if revenue crosses 1 Crore this month
            celebrateMedium(`confetti_monthly_target_${new Date().getFullYear()}_${new Date().getMonth()}`);
        }
    }, [revenueCollected]);

    const gstLiability = stats?.gstLiability || 0;

    const analyticsData = stats?.analyticsData || [];
    const recentDeliveries = stats?.recentDeliveries || [];
    const topCustomers = stats?.topCustomers || [];
    const lowStock = stats?.lowStock || [];
    const upcomingDeliveries = stats?.upcomingDeliveries || [];

    const maxCustValue = topCustomers.length > 0 ? Math.max(...topCustomers.map((c: any) => c.revenue)) : 1;

    return (
        <div className={styles.dashboardPage}>
            {/* PAGE HEADER */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>
                        Good morning, <span className="font-semibold text-slate-800">{user?.name || 'Admin'}</span> — here&apos;s your business today
                    </p>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.dateBadge}>
                        <Calendar className="w-4 h-4" />
                        {formattedDate}
                    </div>
                    <button
                        onClick={() => fetchStats(true)}
                        className="action-btn-secondary"
                        disabled={refreshing}
                        title="Sync live metrics"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? styles.syncIconSpin : ''}`} />
                        <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-status-error-bg border border-red-200 text-status-error-text rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    {error}
                </div>
            )}

            {/* ROW 1 — 4 METRIC CARDS */}
            <div className={styles.widgetRow}>
                <StatWidget
                    label="Orders This Month"
                    value={ordersReceived}
                    badge={`${ordersReceivedChange >= 0 ? '▲' : '▼'} ${Math.abs(ordersReceivedChange).toFixed(1)}%`}
                    badgeType={ordersReceivedChange >= 0 ? 'positive' : 'negative'}
                    accentColor="#AF52DE"
                    icon={<ShoppingBag />}
                />

                <StatWidget
                    label="Revenue Collected"
                    value={formatRupee(revenueCollected)}
                    badge={`${revenueCollectedChange >= 0 ? '▲' : '▼'} ${Math.abs(revenueCollectedChange).toFixed(1)}%`}
                    badgeType={revenueCollectedChange >= 0 ? 'positive' : 'negative'}
                    accentColor="#34C759"
                    icon={<TrendingUp />}
                />

                <StatWidget
                    label="Orders Delivered"
                    value={ordersDelivered}
                    badge={`${ordersDeliveredChange >= 0 ? '▲' : '▼'} ${Math.abs(ordersDeliveredChange).toFixed(1)}%`}
                    badgeType={ordersDeliveredChange >= 0 ? 'positive' : 'negative'}
                    accentColor="#0071E3"
                    icon={<CheckCircle2 />}
                />

                <StatWidget
                    label="Outstanding Payments"
                    value={formatRupee(outstandingAmount)}
                    badge={`${outstandingAmountChange >= 0 ? '▲' : '▼'} ${Math.abs(outstandingAmountChange).toFixed(1)}%`}
                    badgeType={outstandingAmountChange > 0 ? 'negative' : 'positive'}
                    accentColor="#FF3B30"
                    icon={<AlertCircle />}
                    pulse={outstandingAmount > 50000}
                />

                <StatWidget
                    label="Net GST Payable"
                    value={formatRupee(gstLiability)}
                    badgeType={gstLiability > 0 ? 'urgent' : 'positive'}
                    accentColor="#FF9F0A"
                    icon={<FileText />}
                    onClick={() => router.push('/gst-report')}
                    sublabel="This Month"
                />
            </div>

            {/* ALERTS SECTION */}
            {(stats?.invoiceAlerts?.length > 0 || stats?.vendorPaymentAlerts?.length > 0) && (
                <div className={styles.widgetRow} style={{ marginTop: '24px' }}>
                    <div className={styles.card} style={{ flex: 1, minWidth: '280px' }}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIconTitle}>
                                <AlertCircle size={18} />
                                <h3>Payment Alerts</h3>
                            </div>
                        </div>
                        <div className={styles.cardContent}>
                            {stats.invoiceAlerts && stats.invoiceAlerts.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <strong>Overdue Invoices</strong>
                                    <ul style={{ marginTop: '8px' }}>
                                        {stats.invoiceAlerts.map((inv: any) => (
                                            <li key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span>{inv.name}</span>
                                                <span>{formatRupee(inv.amount)} due {inv.dueDate}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {stats.vendorPaymentAlerts && stats.vendorPaymentAlerts.length > 0 && (
                                <div>
                                    <strong>Overdue Vendor Payments</strong>
                                    <ul style={{ marginTop: '8px' }}>
                                        {stats.vendorPaymentAlerts.map((vp: any) => (
                                            <li key={vp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span>{vp.name} ({vp.workType})</span>
                                                <span>{formatRupee(vp.balance)} due {vp.dueDate}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ROW 2 — TREND CARDS */}
            <div className={styles.gridRowDouble}>
                {/* Revenue vs Delivery Analytics */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIconTitle}>
                            <TrendingUp size={18} />
                            <h3>Revenue & Delivery Performance</h3>
                        </div>
                    </div>
                    <div className={styles.cardContent}>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAED" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} contentStyle={{ borderRadius: '10px', border: '1px solid #E8EAED' }} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', paddingTop: '10px' }} />
                                    <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={14} name="Revenue" />
                                    <Bar dataKey="orders" fill="#D1D5DB" radius={[4, 4, 0, 0]} barSize={14} name="Orders Received" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Customers list */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIconTitle}>
                            <Users size={18} />
                            <h3>Top Enterprise Clients</h3>
                        </div>
                    </div>
                    <div className={styles.cardContent}>
                        {topCustomers.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Users size={32} />
                                <p>No enterprise revenue recorded this month</p>
                            </div>
                        ) : (
                            topCustomers.map((cust: any, index: number) => {
                                const sharePercent = maxCustValue > 0 ? Math.round((cust.revenue / maxCustValue) * 100) : 0;
                                return (
                                    <div key={cust.id} className={styles.customerItem}>
                                        <div className={styles.customerMeta}>
                                            <span className={styles.customerName}>
                                                {index + 1}. {cust.name}
                                            </span>
                                            <span className={styles.customerRevenue}>{formatRupee(cust.revenue)}</span>
                                        </div>
                                        <div className={styles.customerProgressWrapper}>
                                            <div className={styles.progressBarContainer}>
                                                <div
                                                    className={styles.progressBarFill}
                                                    style={{ width: `${sharePercent}%` }}
                                                />
                                            </div>
                                            <span className={styles.customerMeters}>
                                                {cust.risk === 'low' ? 'Enterprise' : 'Mid-tier'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ROW 3 — OPERATIONAL STATS */}
            <div className={styles.gridRow}>
                {/* Upcoming Deliveries */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIconTitle}>
                            <Clock size={18} />
                            <h3>Upcoming Schedules</h3>
                        </div>
                        <button onClick={() => router.push('/orders')} className={styles.cardActionLink}>
                            <span>View All</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                    <div className={styles.cardContent}>
                        {upcomingDeliveries.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Clock size={32} />
                                <p>No scheduled deliveries this week</p>
                            </div>
                        ) : (
                            <table className={styles.simpleTable}>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Quantity</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {upcomingDeliveries.slice(0, 5).map((u: any) => (
                                        <tr key={u.id}>
                                            <td className="font-semibold">{u.customer}</td>
                                            <td>{u.quantity}</td>
                                            <td>
                                                <span className={`${styles.badge} ${u.status === 'Scheduled' ? styles.badgeScheduled : styles.badgeProduction}`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Recent Deliveries */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIconTitle}>
                            <CheckCircle2 size={18} />
                            <h3>Completed Orders</h3>
                        </div>
                        <button onClick={() => router.push('/orders')} className={styles.cardActionLink}>
                            <span>View All</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                    <div className={styles.cardContent}>
                        {recentDeliveries.length === 0 ? (
                            <div className={styles.emptyState}>
                                <CheckCircle2 size={32} />
                                <p>No recent orders completed yet</p>
                            </div>
                        ) : (
                            <table className={styles.simpleTable}>
                                <thead>
                                    <tr>
                                        <th>Client</th>
                                        <th>Design</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentDeliveries.slice(0, 5).map((d: any) => (
                                        <tr key={d.id}>
                                            <td className="font-semibold">{d.customer}</td>
                                            <td>{d.design}</td>
                                            <td>
                                                <span className={`${styles.badge} ${styles.badgeDelivered}`}>
                                                    Delivered
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Critical / Low Stock warning */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIconTitle}>
                            <Package size={18} />
                            <h3>Inventory Warning</h3>
                        </div>
                        <button onClick={() => router.push('/inventory')} className={styles.cardActionLink}>
                            <span>Manage Stock</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                    <div className={styles.cardContent}>
                        {lowStock.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Package size={32} />
                                <p>All items adequately stocked</p>
                            </div>
                        ) : (
                            <table className={styles.simpleTable}>
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Quantity</th>
                                        <th>Alert</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStock.slice(0, 5).map((s: any) => (
                                        <tr key={s.id}>
                                            <td className="font-semibold">{s.name}</td>
                                            <td>{s.remaining}</td>
                                            <td>
                                                <span className={`${styles.badge} ${s.status === 'out' ? styles.badgeOut : styles.badgeLow}`}>
                                                    {s.status === 'out' ? 'Out of Stock' : 'Low Stock'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
