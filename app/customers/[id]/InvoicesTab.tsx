'use client';

import React from 'react';
import { Receipt, Share2, Bell, MoreHorizontal, Download } from 'lucide-react';
import styles from './Tabs.module.css';

interface InvoicesTabProps {
    invoices: any[];
    onUpdate: () => void;
}

export default function InvoicesTab({ invoices, onUpdate }: InvoicesTabProps) {
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className={styles.tabContent}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Amount</th>
                            <th>Payment Progress</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(invoice => {
                            const paidAmount = invoice.paid_amount || 0;
                            const progress = Math.min(100, (paidAmount / invoice.amount) * 100);
                            const isOverdue = invoice.status === 'overdue' || (invoice.status === 'unpaid' && invoice.due_date < Math.floor(Date.now() / 1000));
                            
                            return (
                                <tr key={invoice.id} className={`${styles.row} ${isOverdue ? styles.rowOverdue : ''}`}>
                                    <td className={styles.idCell}>{invoice.invoice_number}</td>
                                    <td className={styles.totalCell}>
                                        <div className={styles.amountInfo}>
                                            <span className={styles.mainAmount}>{formatCurrency(invoice.amount)}</span>
                                            {paidAmount > 0 && <span className={styles.subAmount}>Paid: {formatCurrency(paidAmount)}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.paymentBarContainer}>
                                            <div className={styles.paymentBarTrack}>
                                                <div 
                                                    className={styles.paymentBarPaid} 
                                                    style={{ width: `${progress}%` }} 
                                                />
                                            </div>
                                            <div className={styles.paymentBarLabel}>
                                                <span className={styles.paidText}>{formatCurrency(paidAmount)}</span>
                                                <span className={styles.divider}>/</span>
                                                <span>{formatCurrency(invoice.amount)} paid</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={styles.dateCell}>
                                        <div className={styles.dateInfo}>
                                            <span>{new Date(invoice.due_date * 1000).toLocaleDateString()}</span>
                                            {isOverdue && <span className={styles.overdueDays}>Overdue</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`${styles.statusPill} ${styles[invoice.status]}`}>
                                            <span>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                                        </div>
                                    </td>
                                    <td className={styles.actionsCell}>
                                        <div className={styles.actionGroup}>
                                            <button className={styles.iconBtn} title="Download"><Download size={16} /></button>
                                            <button className={styles.iconBtn} title="Send Reminder"><Bell size={16} /></button>
                                            <button className={styles.iconBtn} title="Share WhatsApp"><Share2 size={16} /></button>
                                            <button className={styles.actionBtnPrimary}>Record Payment</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Mobile Cards View */}
                <div className={styles.mobileCardsList}>
                    {invoices.map(invoice => {
                        const paidAmount = invoice.paid_amount || 0;
                        const progress = Math.min(100, (paidAmount / invoice.amount) * 100);
                        const isOverdue = invoice.status === 'overdue' || (invoice.status === 'unpaid' && invoice.due_date < Math.floor(Date.now() / 1000));
                        
                        return (
                            <div key={invoice.id} className={`${styles.mobileCard} ${isOverdue ? styles.rowOverdue : ''}`}>
                                {/* Header: Badge & Amount */}
                                <div className={styles.mobileCardHeader}>
                                    <div className={`${styles.statusPill} ${styles[invoice.status]}`}>
                                        <span>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                                    </div>
                                    <span className={styles.mobilePrice}>
                                        {formatCurrency(invoice.amount)}
                                    </span>
                                </div>

                                {/* Body: Invoice #, Date, Progress Bar */}
                                <div className={styles.mobileCardBody}>
                                    <div className={styles.mobileCustomerName}>
                                        Invoice #{invoice.invoice_number}
                                    </div>
                                    <div className={styles.mobileMetaGroup}>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Due Date:</span>
                                            <span className={styles.dateInfo} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span>{new Date(invoice.due_date * 1000).toLocaleDateString()}</span>
                                                {isOverdue && <span className={styles.overdueDays}>Overdue</span>}
                                            </span>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Paid Amount:</span>
                                            <strong>{formatCurrency(paidAmount)}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Balance Remaining:</span>
                                            <strong style={{ color: isOverdue ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                                {formatCurrency(Math.max(0, invoice.amount - paidAmount))}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className={styles.paymentBarContainer} style={{ width: '100%', marginTop: '6px' }}>
                                        <div className={styles.paymentBarTrack}>
                                            <div 
                                                className={styles.paymentBarPaid} 
                                                style={{ width: `${progress}%` }} 
                                            />
                                        </div>
                                        <div className={styles.paymentBarLabel}>
                                            <span className={styles.paidText}>{formatCurrency(paidAmount)}</span>
                                            <span className={styles.divider}>/</span>
                                            <span>{formatCurrency(invoice.amount)} paid</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className={styles.mobileCardActions}>
                                    <button className={styles.iconBtn} title="Download"><Download size={16} /></button>
                                    <button className={styles.iconBtn} title="Send Reminder"><Bell size={16} /></button>
                                    <button className={styles.iconBtn} title="Share WhatsApp"><Share2 size={16} /></button>
                                    <button className={styles.actionBtnPrimary}>Record Payment</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
