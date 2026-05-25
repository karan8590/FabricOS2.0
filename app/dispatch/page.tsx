'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, MapPin, CheckCircle2, Clock, ArrowUpRight, Loader2, Search, SlidersHorizontal, MoreHorizontal, Printer, Package, Navigation, Send, Eye } from 'lucide-react';
import { formatCurrencySafe } from '@/lib/utils';
import Input from '@/components/ui/Input';
import GroupedPeriodSection from '@/components/ui/GroupedPeriodSection';
import styles from './Dispatch.module.css';

interface DispatchBatch {
    id: number;
    dispatch_number: string;
    vehicle_number: string;
    driver_name: string;
    driver_phone: string | null;
    route: string | null;
    dispatch_date: string;
    status: string;
    created_at: number;
    total_orders: number;
    delivered_orders: number;
    total_meters: number | null;
}

interface VendorDispatch {
    id: number;
    dispatch_number: string;
    order_id: number;
    vendor_id: number;
    vendor_name: string;
    customer_name: string;
    order_number: string;
    process_type: string;
    sent_date: number;
    expected_return_date: number | null;
    rate_per_meter: number;
    total_meters: number;
    total_cost: number;
    status: string;
    returned_at: number | null;
}

type TabType = 'customer' | 'vendor' | 'factory';

export default function DispatchCenter() {
    const router = useRouter();
    const [dispatches, setDispatches] = useState<DispatchBatch[]>([]);
    const [vendorDispatches, setVendorDispatches] = useState<VendorDispatch[]>([]);
    const [factoryOrders, setFactoryOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('vendor');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [custRes, vendRes, factRes] = await Promise.all([
                fetch('/api/dispatch'),
                fetch('/api/dispatch/vendor'),
                fetch('/api/dispatch/factory')
            ]);
            if (custRes.ok) setDispatches(await custRes.json());
            if (vendRes.ok) setVendorDispatches(await vendRes.json());
            if (factRes.ok) {
                const data = await factRes.json();
                if (data.orders) setFactoryOrders(data.orders);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const activeCount = dispatches.filter(d => d.status === 'out_for_delivery').length;
    const partialCount = dispatches.filter(d => d.status === 'out_for_delivery' && d.delivered_orders > 0 && d.delivered_orders < d.total_orders).length;
    const deliveredCount = dispatches.filter(d => d.status === 'delivered').length;

    const vendorSentCount = vendorDispatches.filter(v => v.status === 'sent').length;
    const vendorReturnedCount = vendorDispatches.filter(v => v.status === 'returned').length;

    const filterBySearch = (item: any) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (item.dispatch_number || '').toLowerCase().includes(term) ||
            (item.vendor_name || '').toLowerCase().includes(term) ||
            (item.order_number || '').toLowerCase().includes(term) ||
            (item.customer_name || '').toLowerCase().includes(term) ||
            (item.driver_name || '').toLowerCase().includes(term) ||
            (item.vehicle_number || '').toLowerCase().includes(term)
        );
    };

    const filteredCustomerDispatches = dispatches.filter(d => {
        if (!filterBySearch(d)) return false;
        if (filter === 'all') return true;
        if (filter === 'partial') return d.status === 'out_for_delivery' && d.delivered_orders > 0 && d.delivered_orders < d.total_orders;
        return d.status === filter;
    });

    const filteredVendorDispatches = vendorDispatches.filter(v => {
        if (!filterBySearch(v)) return false;
        if (filter === 'all') return true;
        if (filter === 'embroidery') return v.process_type === 'embroidery';
        if (filter === 'dyeing') return v.process_type === 'dyeing';
        return v.status === filter; // 'sent' or 'returned'
    });

    const filteredFactoryOrders = factoryOrders.filter(o => {
        if (!filterBySearch(o)) return false;
        if (filter === 'all') return true;
        return o.status === filter;
    });

    const groupedData = useMemo(() => {
        const groups: Record<string, { month: number; year: number; monthName: string; records: any[] }> = {};
        const processItem = (dateNum: number, item: any) => {
            const date = new Date(dateNum);
            const y = date.getFullYear();
            const m = date.getMonth() + 1;
            const key = `${m}-${y}`;
            if (!groups[key]) {
                groups[key] = { month: m, year: y, monthName: date.toLocaleString('default', { month: 'long' }), records: [] };
            }
            groups[key].records.push(item);
        };

        if (activeTab === 'customer') {
            filteredCustomerDispatches.forEach(d => processItem(new Date(d.dispatch_date).getTime(), d));
        } else if (activeTab === 'factory') {
            filteredFactoryOrders.forEach(o => processItem((o.order_date || o.created_at) * 1000, o));
        } else {
            filteredVendorDispatches.forEach(v => processItem(v.sent_date, v));
        }

        return Object.values(groups).sort((a,b) => b.year - a.year || b.month - a.month);
    }, [activeTab, filteredCustomerDispatches, filteredFactoryOrders, filteredVendorDispatches]);

    const renderActionBtn = (label: string, icon: React.ReactNode, color: string, bg: string, border: string) => (
        <button style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: bg,
            color: color,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
        }}>
            {icon} {label}
        </button>
    );

    const renderTableForGroup = (records: any[]) => {
        if (activeTab === 'customer') {
            return (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Dispatch ID</th>
                                <th>Tempo / Driver</th>
                                <th>Total Quantity</th>
                                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(d => {
                                const isDelivered = d.status === 'delivered';
                                const rowClass = isDelivered ? styles.rowGreen : styles.rowBlue;
                                return (
                                    <tr key={d.id} className={`${styles.tableRow} ${rowClass}`}>
                                        <td className={styles.td}>
                                            <div className={styles.dispatchNum}>{d.dispatch_number}</div>
                                            <div className={styles.dispatchDate}>{new Date(d.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.vehicleInfo}>{d.vehicle_number}</div>
                                            <div className={styles.driverInfo}>{d.driver_name}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{d.total_meters}m</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.actionsWrapper}>
                                                {isDelivered 
                                                    ? renderActionBtn('Completed', <CheckCircle2 size={16}/>, '#16A34A', 'rgba(22, 163, 74, 0.08)', 'rgba(22, 163, 74, 0.2)')
                                                    : renderActionBtn('Out for Delivery', <Navigation size={16}/>, '#0EA5E9', 'rgba(14, 165, 233, 0.08)', 'rgba(14, 165, 233, 0.2)')
                                                }
                                                <button className={styles.viewBtn} onClick={() => router.push(`/dispatch/${d.id}`)}>
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        } else if (activeTab === 'factory') {
            return (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Design</th>
                                <th>Quantity</th>
                                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(o => {
                                let btn = renderActionBtn('Approve Order', <CheckCircle2 size={16}/>, '#D97706', 'rgba(217, 119, 6, 0.05)', 'rgba(217, 119, 6, 0.15)');
                                let rowClass = styles.rowOrange;
                                if (o.status === 'embroidery') { btn = renderActionBtn('Mark Printing', <Printer size={16}/>, '#4F46E5', 'rgba(79, 70, 229, 0.05)', 'rgba(79, 70, 229, 0.15)'); rowClass = styles.rowPurple; }
                                else if (o.status === 'printing') { btn = renderActionBtn('Send To Dyeing', <ArrowUpRight size={16}/>, '#0EA5E9', 'rgba(14, 165, 233, 0.05)', 'rgba(14, 165, 233, 0.15)'); rowClass = styles.rowBlue; }
                                else if (o.status === 'dyeing') { btn = renderActionBtn('Mark Ready', <Package size={16}/>, '#EA580C', 'rgba(234, 88, 12, 0.05)', 'rgba(234, 88, 12, 0.15)'); rowClass = styles.rowOrange; }
                                else if (o.status === 'ready') { btn = renderActionBtn('Dispatch', <Truck size={16}/>, '#EA580C', 'rgba(234, 88, 12, 0.05)', 'rgba(234, 88, 12, 0.15)'); rowClass = styles.rowOrange; }

                                return (
                                <tr key={o.id} className={`${styles.tableRow} ${rowClass}`}>
                                    <td className={styles.td}>
                                        <div className={styles.dispatchNum}>{o.order_number || `ORD-${o.id}`}</div>
                                        <div className={styles.dispatchDate}>{new Date((o.order_date || o.created_at) * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.vehicleInfo}>{o.customer_name}</div>
                                        <div className={styles.driverInfo}>{o.customer_phone}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.vehicleInfo}>{o.design_name}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{o.quantity_meters}m</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.actionsWrapper}>
                                            {btn}
                                            <button className={styles.viewBtn} onClick={() => router.push(`/orders/${o.id}`)}>
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            );
        } else {
            return (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Dispatch ID</th>
                                <th>Vendor</th>
                                <th>Timeline</th>
                                <th>Quantity</th>
                                <th>Cost</th>
                                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(v => {
                                const isReturned = v.status === 'returned';
                                const rowClass = isReturned ? styles.rowGreen : (v.process_type === 'embroidery' ? styles.rowPurple : styles.rowBlue);
                                return (
                                    <tr key={v.id} className={`${styles.tableRow} ${rowClass}`}>
                                        <td className={styles.td}>
                                            <div className={styles.dispatchNum}>{v.dispatch_number}</div>
                                            <div className={styles.dispatchDate}>{v.order_number}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.vehicleInfo}>{v.vendor_name}</div>
                                            <div className={styles.driverInfo}>{v.customer_name}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.driverInfo}>Sent: {new Date(v.sent_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                            {v.expected_return_date && (
                                                <div className={styles.driverInfo}>Exp: {new Date(v.expected_return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{v.total_meters}m</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{formatCurrencySafe(v.total_cost)}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.actionsWrapper}>
                                                {isReturned 
                                                    ? renderActionBtn('Returned', <CheckCircle2 size={16}/>, '#16A34A', 'rgba(22, 163, 74, 0.08)', 'rgba(22, 163, 74, 0.2)')
                                                    : renderActionBtn('Sent to Vendor', <Send size={16}/>, '#AF52DE', 'rgba(175, 82, 222, 0.08)', 'rgba(175, 82, 222, 0.2)')
                                                }
                                                <button className={styles.viewBtn} onClick={() => router.push(`/dispatch/vendor/${v.id}`)}>
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }
    };

    return (
        <div className={styles.dispatchPage}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Dispatch Center</h1>
                <p className={styles.pageSubtitle}>Manage vendor dispatches and customer deliveries</p>
            </div>

            {/* Dashboard Cards (Orders Page Style) */}
            <div className={styles.widgetRow}>
                <div className={`${styles.widget} ${styles.blue}`}>
                    <div className={styles.widgetHeader}>
                        <div className={styles.iconBox}><Truck size={16} /></div>
                        <div className={styles.label}>Active Deliveries</div>
                    </div>
                    <div className={styles.bigNumber}>{activeCount}</div>
                </div>
                
                <div className={`${styles.widget} ${styles.orange}`}>
                    <div className={styles.widgetHeader}>
                        <div className={styles.iconBox}><Clock size={16} /></div>
                        <div className={styles.label}>Partial Deliveries</div>
                    </div>
                    <div className={styles.bigNumber}>{partialCount}</div>
                </div>
                
                <div className={`${styles.widget} ${styles.purple}`}>
                    <div className={styles.widgetHeader}>
                        <div className={styles.iconBox}><ArrowUpRight size={16} /></div>
                        <div className={styles.label}>Vendor Dispatches Out</div>
                    </div>
                    <div className={styles.bigNumber}>{vendorSentCount}</div>
                </div>
                
                <div className={`${styles.widget} ${styles.green}`}>
                    <div className={styles.widgetHeader}>
                        <div className={styles.iconBox}><CheckCircle2 size={16} /></div>
                        <div className={styles.label}>Total Completed</div>
                    </div>
                    <div className={styles.bigNumber}>{deliveredCount + vendorReturnedCount}</div>
                </div>
            </div>

            <div className={styles.tabsContainer}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'vendor' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('vendor'); setFilter('all'); }}
                >
                    Vendor Dispatches
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'factory' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('factory'); setFilter('all'); }}
                >
                    Factory Production
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'customer' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('customer'); setFilter('all'); }}
                >
                    Customer Deliveries
                </button>
            </div>

            <div className={styles.filtersRow}>
                <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('all')}>All</button>
                {activeTab === 'customer' ? (
                    <>
                        <button className={`${styles.filterBtn} ${filter === 'out_for_delivery' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('out_for_delivery')}>Out for Delivery</button>
                        <button className={`${styles.filterBtn} ${filter === 'partial' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('partial')}>Partial Delivery</button>
                        <button className={`${styles.filterBtn} ${filter === 'delivered' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('delivered')}>Delivered</button>
                    </>
                ) : activeTab === 'factory' ? (
                    <>
                        <button className={`${styles.filterBtn} ${filter === 'approved' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('approved')}>Approved</button>
                        <button className={`${styles.filterBtn} ${filter === 'embroidery' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('embroidery')}>Embroidery</button>
                        <button className={`${styles.filterBtn} ${filter === 'printing' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('printing')}>Printing</button>
                        <button className={`${styles.filterBtn} ${filter === 'dyeing' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('dyeing')}>Dyeing</button>
                        <button className={`${styles.filterBtn} ${filter === 'ready' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('ready')}>Ready</button>
                    </>
                ) : (
                    <>
                        <button className={`${styles.filterBtn} ${filter === 'embroidery' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('embroidery')}>Embroidery</button>
                        <button className={`${styles.filterBtn} ${filter === 'dyeing' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('dyeing')}>Dyeing</button>
                        <button className={`${styles.filterBtn} ${filter === 'sent' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('sent')}>Sent</button>
                        <button className={`${styles.filterBtn} ${filter === 'returned' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('returned')}>Returned</button>
                    </>
                )}
            </div>

            <div className={styles.controlsRow}>
                <div className={styles.searchWrapper}>
                    <Input 
                        icon={<Search size={16} />} 
                        placeholder="Search by vendor, order or dispatch ID..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <button className={styles.filterControlsBtn}>
                    <SlidersHorizontal size={16} /> Filter
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Loading dispatch board...</span>
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ height: '56px', background: 'var(--bg-secondary)', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
                    ))}
                </div>
            ) : groupedData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-primary)' }}>
                    No dispatches found.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {groupedData.map((group) => {
                        const key = `${group.month}-${group.year}`;
                        const currentMonthKey = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
                        const isExpanded = collapsedMonths[key] !== undefined 
                            ? !collapsedMonths[key] 
                            : key === currentMonthKey;

                        const metrics: any[] = [
                            { value: group.records.length, label: 'records', type: 'neutral' }
                        ];

                        if (activeTab === 'vendor') {
                            const totalCost = group.records.reduce((sum, v) => {
                                const costVal = v.total_cost ?? 0;
                                const parsedCost = Number(String(costVal).replace(/[₹,\s]/g, "")) || 0;
                                return sum + parsedCost;
                            }, 0);
                            if (totalCost > 0) {
                                const formattedCost = new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                    maximumFractionDigits: 0,
                                }).format(totalCost);
                                metrics.push({ value: formattedCost, label: 'cost', type: 'info' });
                            }
                        } else if (activeTab === 'customer' || activeTab === 'factory') {
                            const totalMeters = group.records.reduce((sum, v) => {
                                const meterVal = v.total_meters ?? v.quantity_meters ?? 0;
                                const parsedMeters = Number(String(meterVal).replace(/[m,\s]/gi, "")) || 0;
                                return sum + parsedMeters;
                            }, 0);
                            if (totalMeters > 0) {
                                metrics.push({ value: `${totalMeters}m`, label: 'meters', type: 'info' });
                            }
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
                                {renderTableForGroup(group.records)}
                            </GroupedPeriodSection>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
