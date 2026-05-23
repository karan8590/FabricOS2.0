'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from '../CustomerPortal.module.css';
import tableStyles from '@/components/ui/Table.module.css';
import { generateInvoicePDF } from '@/lib/pdf/generateInvoice';

export default function CustomerOrdersPage() {
    const { id } = useParams();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, [id]);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`/api/orders?customerId=${id}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['pending', 'approved', 'in-production', 'ready', 'shipped', 'completed'];
        return steps.indexOf(status.toLowerCase());
    };

    return (
        <div className={styles.portalPage}>
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Your Orders</h1>
                <p className={styles.pageSubtitle}>Track your manufacturing progress and order history</p>
            </header>

            {loading ? (
                <div className={styles.loading}>Loading your orders...</div>
            ) : (
                <div className={tableStyles.tableContainer}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>Order ID</th>
                                <th className={tableStyles.th}>Design</th>
                                <th className={tableStyles.th}>Quantity</th>
                                <th className={tableStyles.th}>Production Status</th>
                                <th className={tableStyles.th}>Payment</th>
                                <th className={tableStyles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {orders.map((order) => (
                                <tr key={order.id} className={tableStyles.tr}>
                                    <td className={tableStyles.td}>
                                        <div className={styles.orderIdCell}>
                                            <span className={styles.orderNumber}>{order.order_number || `#${order.id}`}</span>
                                            <span className={styles.orderDate}>{new Date(order.created_at * 1000).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className={tableStyles.td}>{order.design_name}</td>
                                    <td className={tableStyles.td}>{order.quantity_meters}m</td>
                                    <td className={tableStyles.td}>
                                        <div className={styles.statusCell}>
                                            <Badge status={order.status} />
                                            <div className={styles.miniProgress}>
                                                <div 
                                                    className={styles.miniProgressFill} 
                                                    style={{ width: `${((getStatusStep(order.status) + 1) / 6) * 100}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableStyles.td}>
                                        <div className={styles.paymentProgressCompact}>
                                            <div className={styles.progressText}>₹{order.amount_paid?.toLocaleString() || 0} / ₹{order.total_price?.toLocaleString()}</div>
                                            <div className={styles.progressBarMini}>
                                                <div 
                                                    className={styles.progressFillMini} 
                                                    style={{ width: `${(order.amount_paid / order.total_price) * 100}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableStyles.td}>
                                        <div className={tableStyles.actions}>
                                            <Button variant="ghost" size="small">View Details</Button>
                                            <Button variant="ghost" size="small" onClick={() => {/* Reorder logic */}}>Reorder</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
