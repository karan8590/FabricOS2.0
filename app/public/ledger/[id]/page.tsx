'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
    ShoppingBag, Receipt, CreditCard, 
    Download, AlertCircle, CheckCircle, 
    Calendar, ArrowLeft, Phone, MessageCircle 
} from 'lucide-react';
import styles from './PublicLedger.module.css';

export default function PublicLedgerPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    
    const id = params?.id;
    const token = searchParams?.get('token');

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id && token) {
            fetchLedgerData();
        } else {
            setError('Access Denied: Missing customer ID or token.');
            setLoading(false);
        }
    }, [id, token]);

    const fetchLedgerData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/public/ledger/${id}?token=${token}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                const errJson = await res.json().catch(() => ({}));
                setError(errJson.error || 'Failed to authenticate. The link might be expired.');
            }
        } catch (err: any) {
            console.error('Ledger fetch error:', err);
            setError('Network error: Could not reach server.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Verifying ledger token...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={styles.errorContainer}>
                <AlertCircle size={48} className={styles.errorIcon} />
                <h2>Verification Failed</h2>
                <p>{error || 'Ledger statement not found.'}</p>
                <div className={styles.errorActions}>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Please contact the business administrator if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    const { customer, metrics, orders, invoices, payments } = data;

    const activeInvoices = invoices.filter((i: any) => i.status !== 'paid');
    const recentPayments = payments.slice(0, 5);

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <div className={styles.profileSection}>
                    <div className={styles.avatar}>
                        {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.profileInfo}>
                        <div className={styles.titleRow}>
                            <h1 className={styles.customerName}>{customer.name}</h1>
                            <span className={`${styles.badge} ${customer.customer_type === 'B2B' ? styles.b2b : styles.b2c}`}>
                                {customer.customer_type || 'B2C'}
                            </span>
                        </div>
                        <p className={styles.meta}>
                            <span>{customer.phone}</span>
                            {customer.state && (
                                <>
                                    <span className={styles.dot}>•</span>
                                    <span>{customer.state} ({customer.state_code})</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </header>

            {/* Metrics Dashboard */}
            <section className={styles.metricsGrid}>
                <div className={`${styles.metricCard} ${styles.dueCard}`}>
                    <div className={styles.cardHeader}>
                        <AlertCircle size={20} className={styles.iconRed} />
                        <span className={styles.metricLabel}>Total Due</span>
                    </div>
                    <span className={styles.metricValue}>{formatCurrency(metrics.outstandingDue)}</span>
                    <span className={styles.metricSub}>Outstanding balance</span>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.cardHeader}>
                        <CreditCard size={20} className={styles.iconGreen} />
                        <span className={styles.metricLabel}>Total Paid</span>
                    </div>
                    <span className={styles.metricValue}>{formatCurrency(metrics.totalPaid)}</span>
                    <span className={styles.metricSub}>All ledger collections</span>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.cardHeader}>
                        <ShoppingBag size={20} className={styles.iconBlue} />
                        <span className={styles.metricLabel}>Total Business</span>
                    </div>
                    <span className={styles.metricValue}>{formatCurrency(metrics.lifetimeRevenue)}</span>
                    <span className={styles.metricSub}>Lifetime Value (LTV)</span>
                </div>
            </section>

            {/* Main Content Area */}
            <main className={styles.mainLayout}>
                {/* Active Outstanding Invoices */}
                <section className={styles.contentSection}>
                    <div className={styles.sectionHeader}>
                        <Receipt size={18} />
                        <h2>Outstanding Invoices ({activeInvoices.length})</h2>
                    </div>

                    {activeInvoices.length === 0 ? (
                        <div className={styles.emptyState}>
                            <CheckCircle size={32} style={{ color: '#34C759', marginBottom: '8px' }} />
                            <p>All clear! No pending payments due.</p>
                        </div>
                    ) : (
                        <div className={styles.listContainer}>
                            {activeInvoices.map((inv: any) => {
                                const balance = Math.max(0, inv.amount - (inv.amount_paid || 0));
                                const progress = Math.min(100, ((inv.amount_paid || 0) / inv.amount) * 100);
                                
                                return (
                                    <div key={inv.id} className={styles.invoiceCard}>
                                        <div className={styles.invoiceHead}>
                                            <div>
                                                <span className={styles.invoiceNum}>{inv.invoice_number}</span>
                                                <span className={styles.invoiceDate}>
                                                    Due: {new Date(inv.due_date * 1000).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <a 
                                                href={inv.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.downloadBtn}
                                            >
                                                <Download size={14} />
                                                <span>PDF</span>
                                            </a>
                                        </div>

                                        <div className={styles.invoicePricing}>
                                            <div className={styles.priceRow}>
                                                <span>Billed:</span>
                                                <strong>{formatCurrency(inv.amount)}</strong>
                                            </div>
                                            <div className={styles.priceRow}>
                                                <span>Remaining:</span>
                                                <span className={styles.balanceDue}>{formatCurrency(balance)}</span>
                                            </div>
                                        </div>

                                        <div className={styles.progressContainer}>
                                            <div className={styles.progressTrack}>
                                                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className={styles.progressLabel}>{progress.toFixed(0)}% paid</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Recent Payments & Chronological activity */}
                <section className={styles.contentSection}>
                    <div className={styles.sectionHeader}>
                        <CreditCard size={18} />
                        <h2>Recent Payments ({recentPayments.length})</h2>
                    </div>

                    {recentPayments.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No payment records found.</p>
                        </div>
                    ) : (
                        <div className={styles.paymentsList}>
                            {recentPayments.map((pay: any) => (
                                <div key={pay.id} className={styles.paymentItem}>
                                    <div className={styles.paymentMain}>
                                        <CheckCircle size={16} style={{ color: '#34C759', flexShrink: 0 }} />
                                        <div>
                                            <span className={styles.paymentAmount}>{formatCurrency(pay.amount)}</span>
                                            <span className={styles.paymentMeta}>Invoice: {pay.invoice_number} via {pay.method.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <span className={styles.paymentDate}>
                                        {new Date(pay.payment_date * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Orders Overview */}
                <section className={styles.contentSection} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.sectionHeader}>
                        <ShoppingBag size={18} />
                        <h2>Manufacturing Orders Track ({orders.length})</h2>
                    </div>

                    {orders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No manufacturing orders placed yet.</p>
                        </div>
                    ) : (
                        <div className={styles.ordersGrid}>
                            {orders.slice(0, 6).map((order: any) => (
                                <div key={order.id} className={styles.orderCard}>
                                    <div className={styles.orderHead}>
                                        <span className={styles.orderNum}>{order.order_number || `#${order.id}`}</span>
                                        <span className={`${styles.orderStatus} ${
                                            order.status === 'completed' || order.status === 'delivered' ? styles.completed :
                                            order.status === 'pending' ? styles.pending : styles.inProduction
                                        }`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className={styles.orderBody}>
                                        <div className={styles.orderRow}>
                                            <span>Design:</span>
                                            <strong>{order.design_name}</strong>
                                        </div>
                                        <div className={styles.orderRow}>
                                            <span>Quantity:</span>
                                            <strong>{parseFloat(order.quantity_meters || 0).toFixed(1)} Mtr</strong>
                                        </div>
                                        <div className={styles.orderRow}>
                                            <span>Date Placed:</span>
                                            <span>{new Date(order.created_at * 1000).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer className={styles.footer}>
                <p>Statement generated automatically via FabricOS ERP</p>
                <p>© {new Date().getFullYear()} FabricOS. All secure links are end-to-end encrypted.</p>
            </footer>
        </div>
    );
}
