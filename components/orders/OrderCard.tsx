import { useState } from 'react';

import Button from '@/components/ui/Button';
import Can from '@/components/auth/Can';
import { usePermission } from '@/hooks/usePermission';
import styles from './OrderCard.module.css';

interface OrderCardProps {
    order: any;
    onUpdate: () => void;
    onGenerateInvoice?: () => void;
}

export default function OrderCard({ order, onUpdate, onGenerateInvoice }: OrderCardProps) {
    const [loading, setLoading] = useState(false);
    const { can } = usePermission();

    const handleApprove = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/approve`, {
                method: 'PATCH',
            });
            if (res.ok) {
                onUpdate();
            }
        } catch (error) {
            console.error('Approve error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkComplete = () => {
        if (onGenerateInvoice) {
            onGenerateInvoice();
        }
    };

    const orderDate = new Date(order.created_at * 1000);
    const isCompleted = order.status === 'delivered' || order.status === 'invoiced';

    return (
        <div className={`${styles.orderCard} ${isCompleted ? styles.completed : ''}`}>
            {/* Section 1: Customer Info */}
            <div className={styles.customerSection}>
                <h3 className={styles.customerName}>{order.customer_name}</h3>
                <p className={styles.orderDate}>
                    {orderDate.toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}
                </p>
                {/* Mobile View Only State */}
                <div className="md:hidden">
                    {/* Potential status indicator for mobile could go here if needed */}
                </div>
            </div>

            {/* Section 2: Stats (Center) */}
            <div className={styles.statsSection}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Design</span>
                    <span className={styles.statValue}>{order.design_name}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Qty</span>
                    <span className={styles.statValue}>{order.quantity_meters}m</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total</span>
                    <span className={`${styles.statValue} ${styles.price}`}>
                        ₹{order.total_price.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Section 3: Actions (Right) */}
            <div className={styles.actionsSection}>
                {isCompleted ? (
                    <div className={styles.deliveredBadge}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Delivered</span>
                    </div>
                ) : (
                    <>
                        {!can('orders.approve') && !can('orders.complete') && (
                            <span className={styles.viewOnlyText}>
                                View Only
                            </span>
                        )}

                        {order.status === 'pending' && (
                            <Can permission="orders.approve">
                                <Button
                                    variant="primary"
                                    size="small"
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className={styles.actionBtn}
                                >
                                    Approve
                                </Button>
                            </Can>
                        )}
                        {(order.status === 'approved') && (
                            <Can permission="orders.complete">
                                <Button
                                    variant="success"
                                    size="small"
                                    onClick={handleMarkComplete}
                                    disabled={loading}
                                    className={styles.actionBtn}
                                >
                                    Complete
                                </Button>
                            </Can>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
