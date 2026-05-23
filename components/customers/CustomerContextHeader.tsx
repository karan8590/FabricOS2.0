'use client';

import React from 'react';
import styles from './CustomerContextHeader.module.css';
import { Phone, MessageCircle, MoreVertical, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface CustomerContextHeaderProps {
    customer: any;
}

export default function CustomerContextHeader({ customer }: CustomerContextHeaderProps) {
    if (!customer) return null;

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const getRiskIcon = () => {
        switch (customer.behavior) {
            case 'Reliable': return <ShieldCheck size={14} />;
            case 'High Risk': return <ShieldAlert size={14} />;
            default: return <Shield size={14} />;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <div className={styles.avatar}>
                    {(customer.name || customer.company_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className={styles.info}>
                    <h2 className={styles.name}>{customer.name || customer.company_name || 'Unknown Customer'}</h2>
                    <div className={styles.meta}>
                        <span className={styles.phone}>{customer.phone}</span>
                        <span className={styles.dot}>•</span>
                        <span className={styles.since}>Member since {new Date(customer.created_at * 1000).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className={styles.right}>
                <div className={styles.statGroup}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Orders</span>
                        <span className={styles.statValue}>{customer.total_orders}</span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Revenue</span>
                        <span className={styles.statValue}>{formatCurrency(customer.ltv)}</span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Due</span>
                        <span className={`${styles.statValue} ${customer.outstanding_amount > 0 ? styles.due : ''}`}>
                            {formatCurrency(customer.outstanding_amount)}
                        </span>
                    </div>
                </div>

                <div className={styles.actions}>
                    <div className={`${styles.riskBadge} ${styles[customer.behavior?.replace(' ', '') || 'New']}`}>
                        {getRiskIcon()}
                        <span>{customer.behavior || 'New'}</span>
                    </div>
                    
                    <div className={styles.buttonGroup}>
                        <a href={`tel:${customer.phone}`} className={styles.actionBtn} title="Call">
                            <Phone size={18} />
                        </a>
                        <a 
                            href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`${styles.actionBtn} ${styles.whatsapp}`}
                            title="WhatsApp"
                        >
                            <MessageCircle size={18} />
                        </a>
                        <button className={styles.moreBtn}>
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
