'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Truck, ChevronLeft, MapPin, Phone, Calendar, FileText,
    CheckCircle2, Package, Printer, User, Hash
} from 'lucide-react';
import styles from '../Dispatch.module.css';

interface DispatchOrder {
    id: number;
    order_id: number;
    delivery_status: string;
    delivered_at: number | null;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    design_name: string;
    quantity_meters: number;
    total_price: number;
}

interface DispatchBatch {
    id: number;
    dispatch_number: string;
    vehicle_number: string;
    driver_name: string;
    driver_phone: string | null;
    route: string | null;
    dispatch_date: string;
    notes: string | null;
    status: string;
    created_at: number;
    orders: DispatchOrder[];
}

export default function DispatchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const dispatchId = params.id as string;

    const [batch, setBatch] = useState<DispatchBatch | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchBatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/dispatch/${dispatchId}`);
            if (res.ok) {
                const data = await res.json();
                // API returns { dispatch: {...}, orders: [...] }
                setBatch({ ...data.dispatch, orders: data.orders });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [dispatchId]);

    useEffect(() => { fetchBatch(); }, [fetchBatch]);

    // Only support marking as delivered (API design is one-directional)
    const toggleDelivery = async (dispatchOrderRowId: number, orderId: number, currentStatus: string) => {
        if (currentStatus === 'delivered') return; // can't undo via API
        setUpdatingOrderId(dispatchOrderRowId);
        try {
            const res = await fetch(`/api/dispatch/${dispatchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dispatchOrderId: dispatchOrderRowId,
                    orderId,
                    action: 'mark_delivered'
                })
            });
            if (res.ok) await fetchBatch();
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const markAllDelivered = async () => {
        if (!batch) return;
        setMarkingAll(true);
        try {
            for (const o of batch.orders) {
                if (o.delivery_status !== 'delivered') {
                    await fetch(`/api/dispatch/${dispatchId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            dispatchOrderId: o.id,
                            orderId: o.order_id,
                            action: 'mark_delivered'
                        })
                    });
                }
            }
            await fetchBatch();
        } catch (err) {
            console.error(err);
        } finally {
            setMarkingAll(false);
        }
    };

    const printChallan = () => {
        if (!batch) return;
        const deliveredOrders = batch.orders.filter(o => o.delivery_status === 'delivered');
        const allOrders = batch.orders;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Delivery Challan – ${batch.dispatch_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
        .company { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .doc-title { font-size: 18px; font-weight: 700; text-align: right; }
        .doc-num { font-size: 13px; color: #555; margin-top: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; }
        .info-box h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
        .info-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 12.5px; }
        .info-label { color: #666; min-width: 90px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #ddd; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12.5px; }
        .status-cell { font-weight: 700; color: #16a34a; }
        .status-pending { color: #d97706; }
        .totals { border-top: 2px solid #111; padding-top: 12px; display: flex; justify-content: flex-end; gap: 40px; }
        .total-item { text-align: right; }
        .total-label { font-size: 11px; color: #666; }
        .total-value { font-size: 16px; font-weight: 700; }
        .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; display: flex; justify-content: space-between; }
        .sig-box { width: 180px; border-top: 1px solid #111; padding-top: 8px; font-size: 11px; color: #666; text-align: center; }
        @media print { body { padding: 16px; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company">FabricOS</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Textile ERP System</div>
        </div>
        <div>
            <div class="doc-title">DELIVERY CHALLAN</div>
            <div class="doc-num">${batch.dispatch_number}</div>
            <div class="doc-num">Date: ${new Date(batch.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h4>Vehicle Details</h4>
            <div class="info-row"><span class="info-label">Vehicle No.:</span><strong>${batch.vehicle_number}</strong></div>
            <div class="info-row"><span class="info-label">Driver:</span>${batch.driver_name}</div>
            ${batch.driver_phone ? `<div class="info-row"><span class="info-label">Phone:</span>${batch.driver_phone}</div>` : ''}
            ${batch.route ? `<div class="info-row"><span class="info-label">Route:</span>${batch.route}</div>` : ''}
        </div>
        <div class="info-box">
            <h4>Dispatch Summary</h4>
            <div class="info-row"><span class="info-label">Total Orders:</span><strong>${allOrders.length}</strong></div>
            <div class="info-row"><span class="info-label">Delivered:</span><strong>${deliveredOrders.length}</strong></div>
            <div class="info-row"><span class="info-label">Total Metres:</span><strong>${allOrders.reduce((s, o) => s + o.quantity_meters, 0)}m</strong></div>
            <div class="info-row"><span class="info-label">Total Value:</span><strong>₹${allOrders.reduce((s, o) => s + o.total_price, 0).toLocaleString('en-IN')}</strong></div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Order No.</th>
                <th>Customer</th>
                <th>Design</th>
                <th>Qty (m)</th>
                <th>Amount</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${allOrders.map((o, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${o.order_number}</strong></td>
                <td>${o.customer_name}<br><span style="font-size:11px;color:#888">${o.customer_phone}</span></td>
                <td>${o.design_name}</td>
                <td>${o.quantity_meters}m</td>
                <td>₹${o.total_price.toLocaleString('en-IN')}</td>
                <td class="${o.delivery_status === 'delivered' ? 'status-cell' : 'status-pending'}">
                    ${o.delivery_status === 'delivered' ? '✓ Delivered' : 'Pending'}
                </td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    ${batch.notes ? `<div style="margin-bottom:20px;"><strong>Notes:</strong> ${batch.notes}</div>` : ''}

    <div class="footer">
        <div class="sig-box">Driver Signature</div>
        <div class="sig-box">Authorised Signatory</div>
        <div class="sig-box">Received By</div>
    </div>
</body>
</html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.onload = () => win.print();
        }
    };

    if (loading) {
        return (
            <div className={styles.detailWrapper}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    Loading dispatch details…
                </div>
            </div>
        );
    }

    if (!batch) {
        return (
            <div className={styles.detailWrapper}>
                <div className={styles.loadingState}>Dispatch not found.</div>
            </div>
        );
    }

    const deliveredCount = batch.orders.filter(o => o.delivery_status === 'delivered').length;
    const totalCount = batch.orders.length;
    const progressPct = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;
    const totalMeters = batch.orders.reduce((s, o) => s + o.quantity_meters, 0);
    const totalValue  = batch.orders.reduce((s, o) => s + o.total_price, 0);
    const allDone = deliveredCount === totalCount && totalCount > 0;

    return (
        <div className={styles.detailWrapper}>
            {/* Back */}
            <button className={styles.backBtn} onClick={() => router.push('/dispatch')}>
                <ChevronLeft size={16} /> Back to Dispatch Center
            </button>

            {/* Header Card */}
            <div className={styles.detailHeader}>
                <div className={styles.detailHeaderIcon}>
                    <Truck size={26} color="#fff" />
                </div>
                <div className={styles.detailHeaderInfo}>
                    <h2 className={styles.detailDispatchNum}>{batch.dispatch_number}</h2>
                    <div className={styles.detailMeta}>
                        <span className={styles.detailMetaItem}>
                            <Truck size={13} /> <strong>{batch.vehicle_number}</strong>
                        </span>
                        <span className={styles.detailMetaItem}>
                            <User size={13} /> {batch.driver_name}
                            {batch.driver_phone && <> · {batch.driver_phone}</>}
                        </span>
                        {batch.route && (
                            <span className={styles.detailMetaItem}>
                                <MapPin size={13} /> {batch.route}
                            </span>
                        )}
                        <span className={styles.detailMetaItem}>
                            <Calendar size={13} />
                            {new Date(batch.dispatch_date).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </span>
                    </div>
                </div>
                <div className={styles.detailActions}>
                    <div className={styles.printActions}>
                        <button className={styles.printBtn} onClick={printChallan}>
                            <Printer size={14} /> Print Challan
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className={styles.detailInfoRow}>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardLabel}>Total Orders</div>
                    <div className={styles.infoCardValue}>{totalCount}</div>
                    <div className={styles.infoCardSub}>{deliveredCount} delivered · {totalCount - deliveredCount} pending</div>
                </div>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardLabel}>Total Metres</div>
                    <div className={styles.infoCardValue}>{totalMeters}m</div>
                    <div className={styles.infoCardSub}>Combined fabric quantity</div>
                </div>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardLabel}>Total Value</div>
                    <div className={styles.infoCardValue}>₹{totalValue.toLocaleString('en-IN')}</div>
                    <div className={styles.infoCardSub}>Across all orders</div>
                </div>
            </div>

            {/* Orders List */}
            <div className={styles.ordersCard}>
                <div className={styles.ordersCardHeader}>
                    <div>
                        <div className={styles.ordersCardTitle}>Orders in this Dispatch</div>
                        <div className={styles.progressSummary}>
                            {deliveredCount} of {totalCount} delivered · {progressPct}%
                        </div>
                        {/* Overall progress bar */}
                        <div style={{ marginTop: '10px', width: '280px' }}>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                            </div>
                        </div>
                    </div>
                    {!allDone && (
                        <button
                            className={styles.markAllBtn}
                            onClick={markAllDelivered}
                            disabled={markingAll}
                        >
                            <CheckCircle2 size={15} />
                            {markingAll ? 'Marking…' : 'Mark All Delivered'}
                        </button>
                    )}
                </div>

                {batch.orders.map(order => {
                    const isDelivered = order.delivery_status === 'delivered';
                    const isUpdating = updatingOrderId === order.id;
                    return (
                        <div key={order.id} className={styles.orderRow}>
                            <div className={styles.orderRowLeft}>
                                <div className={styles.orderRowNum}>{order.order_number}</div>
                                <div className={styles.orderRowCustomer}>{order.customer_name} · {order.customer_phone}</div>
                                <div className={styles.orderRowMeta}>
                                    <span><Package size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {order.design_name}</span>
                                    <span>{order.quantity_meters}m</span>
                                    <span>₹{order.total_price.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            <div className={styles.orderRowRight}>
                                <span className={`${styles.statusPill} ${isDelivered ? styles.pillDelivered : styles.pillOutForDelivery}`}>
                                    <span className={styles.pillDot} />
                                    {isDelivered ? 'Delivered' : 'Pending'}
                                </span>
                                <div className={styles.toggleContainer}>
                                    <span className={styles.toggleLabel}>{isDelivered ? 'Done' : 'Deliver'}</span>
                                    <label className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={isDelivered}
                                            disabled={isUpdating}
                                            onChange={() => toggleDelivery(order.id, order.order_id, order.delivery_status)}
                                        />
                                        <span className={styles.toggleSlider} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {batch.notes && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--separator)' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>
                            Notes
                        </div>
                        <div className={styles.notes}>{batch.notes}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
