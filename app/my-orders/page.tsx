'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import styles from './MyOrders.module.css';

interface Order {
    id: number;
    design_name: string;
    quantity_meters: number;
    total_price: number;
    status: string;
    created_at: number;
    approved_at?: number;
    completed_at?: number;
}

export default function MyOrdersPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'customer') {
            router.push('/orders');
            return;
        }
        fetchMyOrders();
    }, [user]);

    const fetchMyOrders = async () => {
        try {
            // Get customer ID first
            const customerRes = await fetch('/api/customers');
            if (!customerRes.ok) return;

            const customerData = await customerRes.json();
            const customer = customerData.customers.find((c: any) => c.user_id === user?.id);

            if (!customer) return;

            // Fetch customer's orders
            const ordersRes = await fetch(`/api/orders?customerId=${customer.id}`);
            if (ordersRes.ok) {
                const data = await ordersRes.json();
                setOrders(data.orders);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusMessage = (order: Order) => {
        switch (order.status) {
            case 'pending':
                return 'Your order is awaiting approval';
            case 'approved':
                return 'Your order has been approved and is in production';
            case 'completed':
                return 'Your order is ready for delivery';
            case 'invoiced':
                return 'Invoice generated - ready for pickup';
            default:
                return '';
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading your orders...</div>;
    }

    return (
        <div className={styles.myOrdersPage}>
            <div className={styles.header}>
                <h1 className={styles.title}>My Orders</h1>
                <p className={styles.subtitle}>Track your order status and history</p>
            </div>

            {orders.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📦</div>
                    <h3 className={styles.emptyTitle}>No Orders Yet</h3>
                    <p className={styles.emptyText}>
                        Browse our catalog and place your first order
                    </p>
                </div>
            ) : (
                <div className={styles.ordersGrid}>
                    {orders.map((order) => (
                        <Card key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <div>
                                    <h3 className={styles.orderTitle}>Order #{order.id}</h3>
                                    <p className={styles.orderDate}>{formatDate(order.created_at)}</p>
                                </div>
                                <Badge status={order.status as any} />
                            </div>

                            <div className={styles.orderDetails}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Design:</span>
                                    <span className={styles.detailValue}>{order.design_name}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Quantity:</span>
                                    <span className={styles.detailValue}>{order.quantity_meters} meters</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Total Price:</span>
                                    <span className={`${styles.detailValue} ${styles.price}`}>
                                        ₹{order.total_price.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.statusMessage}>
                                <div className={styles.statusIcon}>
                                    {order.status === 'pending' && '⏳'}
                                    {order.status === 'approved' && '⚙️'}
                                    {order.status === 'completed' && '✅'}
                                    {order.status === 'invoiced' && '📄'}
                                </div>
                                <p>{getStatusMessage(order)}</p>
                            </div>

                            <div className={styles.timeline}>
                                <div className={`${styles.timelineItem} ${styles.done}`}>
                                    <div className={styles.timelineDot}></div>
                                    <div className={styles.timelineContent}>
                                        <div className={styles.timelineLabel}>Ordered</div>
                                        <div className={styles.timelineDate}>{formatDate(order.created_at)}</div>
                                    </div>
                                </div>

                                <div className={`${styles.timelineItem} ${order.approved_at ? styles.done : ''}`}>
                                    <div className={styles.timelineDot}></div>
                                    <div className={styles.timelineContent}>
                                        <div className={styles.timelineLabel}>Approved</div>
                                        {order.approved_at && (
                                            <div className={styles.timelineDate}>{formatDate(order.approved_at)}</div>
                                        )}
                                    </div>
                                </div>

                                <div className={`${styles.timelineItem} ${order.completed_at ? styles.done : ''}`}>
                                    <div className={styles.timelineDot}></div>
                                    <div className={styles.timelineContent}>
                                        <div className={styles.timelineLabel}>Completed</div>
                                        {order.completed_at && (
                                            <div className={styles.timelineDate}>{formatDate(order.completed_at)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
