'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from '../CustomerPortal.module.css';
import tableStyles from '@/components/ui/Table.module.css';
import { generateInvoicePDF } from '@/lib/pdf/generateInvoice';

export default function CustomerInvoicesPage() {
    const { id } = useParams();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, [id]);

    const fetchInvoices = async () => {
        try {
            const res = await fetch(`/api/invoices?customerId=${id}`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(data.invoices);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className={styles.portalPage}>
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Invoices</h1>
                <p className={styles.pageSubtitle}>Review and pay your manufacturing invoices</p>
            </header>

            {loading ? (
                <div className={styles.loading}>Loading invoices...</div>
            ) : (
                <div className={tableStyles.tableContainer}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>Invoice ID</th>
                                <th className={tableStyles.th}>Order Ref</th>
                                <th className={tableStyles.th}>Date</th>
                                <th className={tableStyles.th}>Amount</th>
                                <th className={tableStyles.th}>Status</th>
                                <th className={tableStyles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {invoices.map((invoice) => {
                                const balance = invoice.amount - (invoice.amount_paid || 0);
                                return (
                                    <tr key={invoice.id} className={tableStyles.tr}>
                                        <td className={tableStyles.td}><strong>{invoice.invoice_number}</strong></td>
                                        <td className={tableStyles.td}>#{invoice.order_id}</td>
                                        <td className={tableStyles.td}>{formatDate(invoice.generated_at)}</td>
                                        <td className={tableStyles.td}>
                                            <div className={styles.amountCell}>
                                                <span className={styles.totalAmount}>₹{invoice.amount.toLocaleString()}</span>
                                                {balance > 0 && <span className={styles.balanceAmount}>₹{balance.toLocaleString()} due</span>}
                                            </div>
                                        </td>
                                        <td className={tableStyles.td}><Badge status={invoice.status} /></td>
                                        <td className={tableStyles.td}>
                                            <div className={tableStyles.actions}>
                                                <Button variant="ghost" size="small" onClick={() => generateInvoicePDF(invoice)}>PDF</Button>
                                                {invoice.status !== 'paid' && <Button variant="primary" size="small">Pay Now</Button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
