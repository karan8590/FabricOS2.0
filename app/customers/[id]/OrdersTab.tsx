'use client';

import React from 'react';
import { Play, CheckCircle2, Truck, Clock, AlertCircle } from 'lucide-react';
import styles from './Tabs.module.css';

interface OrdersTabProps {
    orders: any[];
    onUpdate: () => void;
}

export default function OrdersTab({ orders, onUpdate }: OrdersTabProps) {
    const handleApprove = async (orderId: number) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/approve`, {
                method: 'PATCH',
            });
            if (res.ok) onUpdate();
        } catch (error) {
            console.error('Approve error:', error);
        }
    };

    const handleGenerateInvoiceClick = async (order: any) => {
        // For simplicity in workspace, we use a direct generate if needed, 
        // but here we just match the logic of Mark Complete
        try {
            const res = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, dueDays: 7 }),
            });
            if (res.ok) onUpdate();
        } catch (error) {
            console.error('Invoice generation error:', error);
        }
    };

    const getStatusConfig = (status: string, isOverdue: boolean) => {
        const s = status.toUpperCase();
        if (isOverdue) return { label: 'Payment Issue', class: styles.rowOverdue, icon: <AlertCircle size={14} /> };
        if (s === 'PENDING') return { label: 'Waiting Approval', class: styles.rowPending, icon: <Clock size={14} /> };
        if (['APPROVED', 'EMBROIDERY_IN_PROGRESS', 'PRINTING_IN_FACTORY', 'DYEING_IN_PROGRESS', 'READY'].includes(s)) return { label: 'In Production', class: styles.rowInProduction, icon: <Play size={14} /> };
        if (s === 'INVOICED' || s === 'COMPLETED') return { label: 'Invoice Generated', class: styles.rowCompleted, icon: <CheckCircle2 size={14} /> };
        return { label: status, class: '', icon: null };
    };

    return (
        <div className={styles.tabContent}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Design</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => {
                            const status = order.status?.toUpperCase() || 'PENDING';
                            const now = Math.floor(Date.now() / 1000);
                            const isFinished = status === 'COMPLETED' || status === 'INVOICED';
                            const isPending = status === 'PENDING';
                            const isInProduction = ['APPROVED', 'EMBROIDERY_IN_PROGRESS', 'PRINTING_IN_FACTORY', 'DYEING_IN_PROGRESS', 'READY'].includes(status);
                            
                            const deliveryDeadline = order.created_at + (7 * 24 * 60 * 60);
                            const isOverdue = !isFinished && now > deliveryDeadline;

                            const statusConfig = getStatusConfig(order.status, isOverdue);
                            const orderDate = new Date(order.created_at * 1000);
                            
                            return (
                                <tr key={order.id} className={`${styles.row} ${statusConfig.class}`}>
                                    <td className={styles.idCell}>#{order.id}</td>
                                    <td className={styles.designCell}>{order.design_name}</td>
                                    <td className={styles.quantityCell}>{order.quantity_meters}m</td>
                                    <td className={styles.totalCell}>₹{order.total_price.toLocaleString('en-IN')}</td>
                                    <td>
                                        <div className={styles.statusPill}>
                                            {statusConfig.icon}
                                            <span>{statusConfig.label}</span>
                                        </div>
                                    </td>
                                    <td className={styles.dateCell}>
                                        {orderDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className={styles.actionsCell}>
                                        <div className={styles.actionGroup}>
                                            {isPending && (
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.btnApprove}`}
                                                    onClick={() => handleApprove(order.id)}
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {isInProduction && !isOverdue && (
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.btnMarkComplete}`}
                                                    onClick={() => handleGenerateInvoiceClick(order)}
                                                >
                                                    Mark Complete
                                                </button>
                                            )}
                                            {isOverdue && (
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.btnFollowUp}`}
                                                    onClick={() => window.open(`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=Hi%20${order.customer_name},%20we're%20following%20up%20on%20order%20%23${order.id}.`, '_blank')}
                                                >
                                                    Follow Up
                                                </button>
                                            )}
                                            {isFinished && (
                                                <div className={styles.statusBadge}>
                                                    ✓ Invoice Generated
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Mobile Cards View */}
                <div className={styles.mobileCardsList}>
                    {orders.map(order => {
                        const status = order.status?.toUpperCase() || 'PENDING';
                        const now = Math.floor(Date.now() / 1000);
                        const isFinished = status === 'COMPLETED' || status === 'INVOICED';
                        const isPending = status === 'PENDING';
                        const isInProduction = ['APPROVED', 'EMBROIDERY_IN_PROGRESS', 'PRINTING_IN_FACTORY', 'DYEING_IN_PROGRESS', 'READY'].includes(status);
                        
                        const deliveryDeadline = order.created_at + (7 * 24 * 60 * 60);
                        const isOverdue = !isFinished && now > deliveryDeadline;

                        const statusConfig = getStatusConfig(order.status, isOverdue);
                        const orderDate = new Date(order.created_at * 1000);
                        
                        return (
                            <div key={order.id} className={`${styles.mobileCard} ${statusConfig.class}`}>
                                {/* Header: Badge & Amount */}
                                <div className={styles.mobileCardHeader}>
                                    <div className={styles.statusPill}>
                                        {statusConfig.icon}
                                        <span>{statusConfig.label}</span>
                                    </div>
                                    <span className={styles.mobilePrice}>
                                        ₹{order.total_price.toLocaleString('en-IN')}
                                    </span>
                                </div>

                                {/* Body: ID, Design Name, Quantity, Date */}
                                <div className={styles.mobileCardBody}>
                                    <div className={styles.mobileCustomerName}>
                                        Order #{order.id}
                                    </div>
                                    <div className={styles.mobileMetaGroup}>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Design Name:</span>
                                            <strong>{order.design_name}</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Quantity:</span>
                                            <strong>{order.quantity_meters}m quantity</strong>
                                        </div>
                                        <div className={styles.mobileMetaRow}>
                                            <span>Order Date:</span>
                                            <span>{orderDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className={styles.mobileCardActions}>
                                    {isPending && (
                                        <button 
                                            className={`${styles.actionBtn} ${styles.btnApprove}`}
                                            onClick={() => handleApprove(order.id)}
                                            style={{ minHeight: '40px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {isInProduction && !isOverdue && (
                                        <button 
                                            className={`${styles.actionBtn} ${styles.btnMarkComplete}`}
                                            onClick={() => handleGenerateInvoiceClick(order)}
                                            style={{ minHeight: '40px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            Mark Complete
                                        </button>
                                    )}
                                    {isOverdue && (
                                        <button 
                                            className={`${styles.actionBtn} ${styles.btnFollowUp}`}
                                            onClick={() => window.open(`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=Hi%20${order.customer_name},%20we're%20following%20up%20on%20order%20%23${order.id}.`, '_blank')}
                                            style={{ minHeight: '40px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            Follow Up
                                        </button>
                                    )}
                                    {isFinished && (
                                        <div className={styles.statusBadge} style={{ minHeight: '40px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            ✓ Invoice Generated
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
