'use client';

import React from 'react';
import styles from './CustomerQuickView.module.css';
import { X, Phone, MessageCircle, ExternalLink, Calendar, CreditCard, AlertCircle, ShoppingBag, Receipt, Share2 } from 'lucide-react';

interface CustomerQuickViewProps {
    customer: any;
    isOpen: boolean;
    onClose: () => void;
    onViewFullOrders: (id: number, name: string) => void;
}

export default function CustomerQuickView({ customer, isOpen, onClose, onViewFullOrders }: CustomerQuickViewProps) {
    if (!customer) return null;

    const handleShareLedger = async (customerId: number, name: string, phone: string) => {
        try {
            const res = await fetch(`/api/share?type=ledger&id=${customerId}`);
            if (res.ok) {
                const data = await res.json();
                const shareUrl = data.url;
                const message = `Hi ${name}, please find your ledger statement. View details here: ${shareUrl}`;
                window.open(`https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                alert('Failed to generate sharing URL');
            }
        } catch (err) {
            console.error('Error sharing ledger:', err);
        }
    };

    const handleShareInvoice = async (customerId: number, name: string, phone: string) => {
        try {
            const workspaceRes = await fetch(`/api/customers/${customerId}/workspace`);
            if (!workspaceRes.ok) {
                alert('Failed to retrieve customer invoices');
                return;
            }
            const data = await workspaceRes.json();
            const unpaidInvoices = data.invoices?.filter((i: any) => i.status !== 'paid') || [];
            if (unpaidInvoices.length === 0) {
                alert('No outstanding invoices found for this customer.');
                return;
            }
            const invoice = unpaidInvoices[0];
            const res = await fetch(`/api/share?type=invoice&id=${invoice.id}`);
            if (res.ok) {
                const shareData = await res.json();
                const shareUrl = shareData.url;
                const message = `Hi ${name}, here is your Tax Invoice ${invoice.invoice_number} for ₹${invoice.amount?.toLocaleString('en-IN')}. Please download here: ${shareUrl}`;
                window.open(`https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                alert('Failed to generate sharing URL');
            }
        } catch (err) {
            console.error('Error sharing invoice:', err);
        }
    };

    return (
        <>
            <div 
                className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`} 
                onClick={onClose} 
            />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <h2 className={styles.title}>Customer Insights</h2>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className={styles.profileSection}>
                        <div className={styles.avatar}>
                            {(customer.name || customer.company_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.profileInfo}>
                            <h3 className={styles.customerName}>{customer.name || customer.company_name || 'Unknown Customer'}</h3>
                            <p className={styles.customerPhone}>{customer.phone}</p>
                        </div>
                        <div className={`${styles.riskBadge} ${styles[customer.behavior?.replace(' ', '') || 'New']}`}>
                            {customer.behavior || 'New Customer'}
                        </div>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(0, 113, 227, 0.1)', color: 'var(--accent)' }}>
                                <ShoppingBag size={18} />
                            </div>
                            <div className={styles.statData}>
                                <span className={styles.statLabel}>Total Orders</span>
                                <span className={styles.statValue}>{customer.total_orders}</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34C759' }}>
                                <CreditCard size={18} />
                            </div>
                            <div className={styles.statData}>
                                <span className={styles.statLabel}>Lifetime Revenue</span>
                                <span className={styles.statValue}>₹{customer.ltv?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>Payment Summary</h4>
                        <div className={styles.paymentCard}>
                            <div className={styles.paymentRow}>
                                <span className={styles.paymentLabel}>Outstanding Due</span>
                                <span className={`${styles.paymentValue} ${customer.outstanding_amount > 0 ? styles.due : ''}`}>
                                    ₹{customer.outstanding_amount?.toLocaleString()}
                                </span>
                            </div>
                            <div className={styles.paymentRow}>
                                <span className={styles.paymentLabel}>Last Order Date</span>
                                <span className={styles.paymentValue}>
                                    {customer.last_order_date ? new Date(customer.last_order_date * 1000).toLocaleDateString() : 'No orders'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>Quick Actions</h4>
                        <div className={styles.actionButtons}>
                            <a href={`tel:${customer.phone}`} className={styles.actionBtn}>
                                <Phone size={18} />
                                <span>Call Customer</span>
                            </a>
                            <a 
                                href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`${styles.actionBtn} ${styles.whatsapp}`}
                            >
                                <MessageCircle size={18} />
                                <span>WhatsApp</span>
                            </a>
                            <button 
                                onClick={() => handleShareInvoice(customer.id, customer.name, customer.phone)} 
                                className={styles.actionBtn} 
                                style={{ background: 'rgba(175, 82, 222, 0.1)', color: '#AF52DE', border: 'none', cursor: 'pointer' }}
                            >
                                <Receipt size={18} />
                                <span>Share Invoice</span>
                            </button>
                            <button 
                                onClick={() => handleShareLedger(customer.id, customer.name, customer.phone)} 
                                className={styles.actionBtn} 
                                style={{ background: 'rgba(255, 149, 0, 0.1)', color: '#FF9500', border: 'none', cursor: 'pointer' }}
                            >
                                <Share2 size={18} />
                                <span>Share Ledger</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button 
                        className={styles.viewFullBtn}
                        onClick={() => onViewFullOrders(customer.id, customer.name)}
                    >
                        <span>View Full Order History</span>
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>
        </>
    );
}
