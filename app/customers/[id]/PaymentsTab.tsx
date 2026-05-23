'use client';

import React from 'react';
import { CreditCard, ArrowUpRight } from 'lucide-react';
import styles from './Tabs.module.css';

interface PaymentsTabProps {
    payments: any[];
}

export default function PaymentsTab({ payments }: PaymentsTabProps) {
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className={styles.tabContent}>
            <div className={styles.paymentSummary}>
                <div className={styles.summaryCard}>
                    <span className={styles.summaryLabel}>Total Collected</span>
                    <span className={styles.summaryValue}>{formatCurrency(totalCollected)}</span>
                </div>
                <div className={styles.summaryCard}>
                    <span className={styles.summaryLabel}>Last Payment</span>
                    <span className={styles.summaryValue}>
                        {payments.length > 0 ? formatCurrency(payments[0].amount) : '₹0'}
                    </span>
                    {payments.length > 0 && <span className={styles.summaryDate}>{new Date(payments[0].payment_date * 1000).toLocaleDateString()}</span>}
                </div>
            </div>

            <div className={styles.timelineContainer}>
                {payments.length === 0 ? (
                    <div className={styles.emptyState}>No payment history found</div>
                ) : (
                    payments.map((p, idx) => (
                        <div key={p.id} className={styles.paymentCard}>
                            <div className={styles.paymentIcon}>
                                <CreditCard size={18} />
                            </div>
                            <div className={styles.paymentInfo}>
                                <div className={styles.paymentHeader}>
                                    <span className={styles.paymentAmount}>{formatCurrency(p.amount)}</span>
                                    <span className={styles.paymentMethod}>{p.method.toUpperCase()}</span>
                                </div>
                                <div className={styles.paymentMeta}>
                                    <span>Ref: {p.invoice_number}</span>
                                    <span className={styles.dot}>•</span>
                                    <span>{new Date(p.payment_date * 1000).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className={styles.paymentArrow}>
                                <ArrowUpRight size={18} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
