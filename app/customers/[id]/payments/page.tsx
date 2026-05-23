'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import styles from '../CustomerPortal.module.css';
import tableStyles from '@/components/ui/Table.module.css';

export default function CustomerPaymentsPage() {
    const { id } = useParams();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/customers/${id}/workspace`)
            .then(res => res.json())
            .then(data => {
                setPayments(data.payments || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    return (
        <div className={styles.portalPage}>
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Payment History</h1>
                <p className={styles.pageSubtitle}>Keep track of all your transactions and ledger entries</p>
            </header>

            {loading ? (
                <div className={styles.loading}>Loading your ledger...</div>
            ) : (
                <div className={tableStyles.tableContainer}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>Reference No.</th>
                                <th className={tableStyles.th}>Invoice</th>
                                <th className={tableStyles.th}>Date</th>
                                <th className={tableStyles.th}>Method</th>
                                <th className={tableStyles.th}>Amount</th>
                                <th className={tableStyles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={tableStyles.td} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                                        No payment records found.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className={tableStyles.tr}>
                                        <td className={tableStyles.td}><strong>{payment.reference_number || `PAY-${payment.id}`}</strong></td>
                                        <td className={tableStyles.td}>{payment.invoice_number || `#${payment.invoice_id}`}</td>
                                        <td className={tableStyles.td}>{new Date(payment.payment_date * 1000).toLocaleDateString()}</td>
                                        <td className={tableStyles.td} style={{ textTransform: 'capitalize' }}>{payment.method.replace('_', ' ')}</td>
                                        <td className={tableStyles.td}>₹{payment.amount.toLocaleString()}</td>
                                        <td className={tableStyles.td}>
                                            <div className={styles.successBadge}>
                                                <CheckCircle2 size={14} />
                                                <span>Completed</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
