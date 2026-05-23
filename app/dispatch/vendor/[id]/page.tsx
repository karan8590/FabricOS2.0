'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Building2, MapPin, Phone, Calendar, FileText, CheckCircle2, IndianRupee, Scissors, PaintBucket } from 'lucide-react';
import styles from '../../Dispatch.module.css';

interface VendorDispatch {
    id: number;
    dispatch_number: string;
    order_id: number;
    vendor_id: number;
    vendor_name: string;
    vendor_phone: string;
    vendor_address: string;
    customer_name: string;
    order_number: string;
    design_name: string;
    quantity_meters: number;
    order_status: string;
    process_type: string;
    sent_date: number;
    expected_return_date: number | null;
    rate_per_meter: number;
    total_meters: number;
    total_cost: number;
    status: string;
    returned_at: number | null;
}

export default function VendorDispatchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const dispatchId = params.id as string;

    const [dispatch, setDispatch] = useState<VendorDispatch | null>(null);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

    const fetchDispatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/dispatch/vendor/${dispatchId}`);
            if (res.ok) {
                const data = await res.json();
                setDispatch(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [dispatchId]);

    useEffect(() => { fetchDispatch(); }, [fetchDispatch]);

    const markReturned = async () => {
        if (!dispatch || dispatch.status === 'returned') return;
        setMarking(true);
        try {
            const res = await fetch(`/api/dispatch/vendor/${dispatchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_returned' })
            });
            if (res.ok) {
                await fetchDispatch();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMarking(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.detailWrapper}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    Loading vendor dispatch details…
                </div>
            </div>
        );
    }

    if (!dispatch) {
        return (
            <div className={styles.detailWrapper}>
                <div className={styles.loadingState}>Vendor Dispatch not found.</div>
            </div>
        );
    }

    const ProcessIcon = dispatch.process_type === 'embroidery' ? Scissors : PaintBucket;
    const isReturned = dispatch.status === 'returned';

    return (
        <div className={styles.detailWrapper}>
            <button className={styles.backBtn} onClick={() => router.push('/dispatch')}>
                <ChevronLeft size={16} /> Back to Dispatch Center
            </button>

            <div className={styles.detailHeader}>
                <div className={styles.detailHeaderIcon} style={{ background: dispatch.process_type === 'embroidery' ? 'linear-gradient(135deg, #AF52DE, #BF5AF2)' : 'linear-gradient(135deg, #0071E3, #0A84FF)' }}>
                    <ProcessIcon size={26} color="#fff" />
                </div>
                <div className={styles.detailHeaderInfo}>
                    <h2 className={styles.detailDispatchNum}>{dispatch.dispatch_number}</h2>
                    <div className={styles.detailMeta}>
                        <span className={styles.detailMetaItem}>
                            <Building2 size={13} /> <strong>{dispatch.vendor_name}</strong>
                        </span>
                        {dispatch.vendor_phone && (
                            <span className={styles.detailMetaItem}>
                                <Phone size={13} /> {dispatch.vendor_phone}
                            </span>
                        )}
                        <span className={styles.detailMetaItem}>
                            <Calendar size={13} /> Sent: {new Date(dispatch.sent_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {dispatch.expected_return_date && (
                            <span className={styles.detailMetaItem}>
                                <Calendar size={13} /> Expected: {new Date(dispatch.expected_return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
                <div className={styles.detailActions}>
                    {!isReturned ? (
                        <button 
                            className={styles.dispatchCreateBtn} 
                            onClick={markReturned}
                            disabled={marking}
                            style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)' }}
                        >
                            <CheckCircle2 size={16} /> {marking ? 'Processing...' : 'Mark Returned'}
                        </button>
                    ) : (
                        <span className={`${styles.statusPill} ${styles.pillDelivered}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
                            <span className={styles.pillDot} /> Returned on {new Date(dispatch.returned_at! * 1000).toLocaleDateString('en-IN')}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.detailInfoRow}>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardLabel}>Vendor Address</div>
                    <div className={styles.infoCardValue} style={{ fontSize: '14px', lineHeight: 1.4, marginTop: '8px' }}>
                        {dispatch.vendor_address || 'No address provided'}
                    </div>
                </div>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardLabel}>Quantity Sent</div>
                    <div className={styles.infoCardValue}>{dispatch.total_meters}m</div>
                    <div className={styles.infoCardSub}>Rate: ₹{dispatch.rate_per_meter}/m</div>
                </div>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardLabel}>Total Cost</div>
                    <div className={styles.infoCardValue}>₹{dispatch.total_cost.toLocaleString('en-IN')}</div>
                    <div className={styles.infoCardSub}>Added to order expenses</div>
                </div>
            </div>

            <div className={styles.ordersCard}>
                <div className={styles.ordersCardHeader}>
                    <div>
                        <div className={styles.ordersCardTitle}>Linked Order</div>
                        <div className={styles.progressSummary}>This dispatch is tied to a specific customer order.</div>
                    </div>
                </div>

                <div className={styles.orderRow} style={{ borderBottom: 'none' }}>
                    <div className={styles.orderRowLeft}>
                        <div className={styles.orderRowNum}>{dispatch.order_number}</div>
                        <div className={styles.orderRowCustomer}>{dispatch.customer_name}</div>
                        <div className={styles.orderRowMeta}>
                            <span><FileText size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {dispatch.design_name}</span>
                            <span>{dispatch.quantity_meters}m total order qty</span>
                        </div>
                    </div>
                    <div className={styles.orderRowRight}>
                        <span className={styles.statusPill} style={{ background: 'var(--bg-grouped)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>
                            Status: {dispatch.order_status.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
