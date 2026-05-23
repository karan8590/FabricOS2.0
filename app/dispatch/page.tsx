'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, MapPin, Package, Calendar, FileText, CheckCircle2, Clock, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrencySafe } from '@/lib/utils';
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

function getStatusLabel(status: string, delivered: number, total: number): string {
    if (status === 'delivered' || (delivered >= total && total > 0)) return 'Delivered';
    if (delivered > 0) return 'Partial Delivery';
    return 'Out for Delivery';
}

function getPillClass(status: string, delivered: number, total: number) {
    const s = status === 'delivered' || (delivered >= total && total > 0);
    if (s) return styles.pillDelivered;
    if (delivered > 0) return styles.pillPartialDelivery;
    return styles.pillOutForDelivery;
}

export default function DispatchCenter() {
    const router = useRouter();
    const [dispatches, setDispatches] = useState<DispatchBatch[]>([]);
    const [vendorDispatches, setVendorDispatches] = useState<VendorDispatch[]>([]);
    const [factoryOrders, setFactoryOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('vendor');
    const [filter, setFilter] = useState('all');

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

    const filteredCustomerDispatches = dispatches.filter(d => {
        if (filter === 'all') return true;
        if (filter === 'partial') return d.status === 'out_for_delivery' && d.delivered_orders > 0 && d.delivered_orders < d.total_orders;
        return d.status === filter;
    });

    const filteredVendorDispatches = vendorDispatches.filter(v => {
        if (filter === 'all') return true;
        if (filter === 'embroidery') return v.process_type === 'embroidery';
        if (filter === 'dyeing') return v.process_type === 'dyeing';
        return v.status === filter; // 'sent' or 'returned'
    });

    const filteredFactoryOrders = factoryOrders.filter(o => {
        if (filter === 'all') return true;
        return o.status === filter;
    });

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIconBox}>
                        <Truck size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 className={styles.pageTitle}>Dispatch Center</h1>
                        <p className={styles.pageSubtitle}>Manage customer deliveries and outsourcing logistics.</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconBlue}`}><Truck size={20} /></div>
                    <div className={styles.statBody}>
                        <div className={styles.statValue}>{activeCount}</div>
                        <div className={styles.statLabel}>Active Deliveries</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconAmber}`}><Clock size={20} /></div>
                    <div className={styles.statBody}>
                        <div className={styles.statValue}>{partialCount}</div>
                        <div className={styles.statLabel}>Partial Deliveries</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconPurple}`}><Building2 size={20} /></div>
                    <div className={styles.statBody}>
                        <div className={styles.statValue}>{vendorSentCount}</div>
                        <div className={styles.statLabel}>Vendor Dispatches Out</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconGreen}`}><CheckCircle2 size={20} /></div>
                    <div className={styles.statBody}>
                        <div className={styles.statValue}>{deliveredCount + vendorReturnedCount}</div>
                        <div className={styles.statLabel}>Total Completed</div>
                    </div>
                </div>
            </div>

            <div className={styles.tabsContainer} style={{ marginBottom: '-10px' }}>
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

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <span className={styles.tableTitle}>
                        {activeTab === 'customer' ? 'Customer Deliveries' : activeTab === 'factory' ? 'Factory Production' : 'Vendor Dispatches'}
                    </span>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent)' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading dispatch board...</span>
                        </div>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} style={{ height: '56px', background: 'var(--bg-secondary)', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
                        ))}
                    </div>
                ) : activeTab === 'customer' ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Dispatch ID</th>
                                <th>Tempo / Driver</th>
                                <th>Progress</th>
                                <th>Total Quantity</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomerDispatches.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No customer dispatches found.</td></tr>
                            ) : filteredCustomerDispatches.map(d => {
                                const pct = d.total_orders > 0 ? Math.round((d.delivered_orders / d.total_orders) * 100) : 0;
                                return (
                                    <tr key={d.id} className={styles.tableRow}>
                                        <td className={styles.td}>
                                            <div className={styles.dispatchNum}>{d.dispatch_number}</div>
                                            <div className={styles.dispatchDate}>{new Date(d.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.vehicleInfo}>{d.vehicle_number}</div>
                                            <div className={styles.driverInfo}>{d.driver_name}</div>
                                            {d.route && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}><MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {d.route}</div>}
                                        </td>
                                        <td className={styles.td} style={{ width: '220px' }}>
                                            <div className={styles.progressWrapper}>
                                                <div className={styles.progressBar}>
                                                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className={styles.progressText}>{d.delivered_orders}/{d.total_orders}</span>
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{d.total_meters}m</div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`${styles.statusPill} ${getPillClass(d.status, d.delivered_orders, d.total_orders)}`}>
                                                <span className={styles.pillDot} />
                                                {getStatusLabel(d.status, d.delivered_orders, d.total_orders)}
                                            </span>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <button className={styles.viewBtn} onClick={() => router.push(`/dispatch/${d.id}`)}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : activeTab === 'factory' ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Design</th>
                                <th>Stage</th>
                                <th>Quantity</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFactoryOrders.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No factory orders found.</td></tr>
                            ) : filteredFactoryOrders.map(o => (
                                <tr key={o.id} className={styles.tableRow}>
                                    <td className={styles.td}>
                                        <div className={styles.dispatchNum}>{o.order_number || `ORD-${o.id}`}</div>
                                        <div className={styles.dispatchDate}>{new Date((o.order_date || o.created_at) * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.vehicleInfo}>{o.customer_name}</div>
                                        <div className={styles.driverInfo}>{o.customer_phone}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.vehicleInfo}>{o.design_name}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <span className={`${styles.statusPill} ${styles.pillPartialDelivery}`} style={{ textTransform: 'capitalize' }}>
                                            <span className={styles.pillDot} />
                                            {o.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className={styles.td}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{o.quantity_meters}m</div>
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'right' }}>
                                        <button className={styles.viewBtn} onClick={() => router.push(`/orders/${o.id}`)}>
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Dispatch ID</th>
                                <th>Vendor</th>
                                <th>Process</th>
                                <th>Timeline</th>
                                <th>Quantity / Cost</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVendorDispatches.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No vendor dispatches found.</td></tr>
                            ) : filteredVendorDispatches.map(v => {
                                return (
                                    <tr key={v.id} className={styles.tableRow}>
                                        <td className={styles.td}>
                                            <div className={styles.dispatchNum}>{v.dispatch_number}</div>
                                            <div className={styles.dispatchDate}>{v.order_number}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.vehicleInfo}>{v.vendor_name}</div>
                                            <div className={styles.driverInfo}>{v.customer_name}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`${styles.statusPill} ${v.process_type === 'embroidery' ? styles.pillEmbroidery : styles.pillDyeing}`}>
                                                <span className={styles.pillDot} />
                                                {v.process_type === 'embroidery' ? 'Embroidery' : 'Dyeing'}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.driverInfo}>Sent: {new Date(v.sent_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                            {v.expected_return_date && (
                                                <div className={styles.driverInfo}>Exp: {new Date(v.expected_return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.vehicleInfo}>{v.total_meters}m</div>
                                            <div className={styles.driverInfo}>{formatCurrencySafe(v.total_cost)}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`${styles.statusPill} ${v.status === 'returned' ? styles.pillDelivered : styles.pillVendorSent}`}>
                                                <span className={styles.pillDot} />
                                                {v.status === 'returned' ? 'Returned' : 'Sent'}
                                            </span>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <button className={styles.viewBtn} onClick={() => router.push(`/dispatch/vendor/${v.id}`)}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
