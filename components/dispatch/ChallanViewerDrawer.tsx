'use client';
import React, { useEffect } from 'react';
import styles from './ChallanViewerDrawer.module.css';

interface ChallanViewerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    batch: any;
    onDownloadPdf: (challanId: number, challanNumber: string) => void;
    onShareWhatsapp: (challanId: number, batch: any) => void;
}

export default function ChallanViewerDrawer({ 
    isOpen, 
    onClose, 
    batch, 
    onDownloadPdf, 
    onShareWhatsapp 
}: ChallanViewerDrawerProps) {
    
    // Prevent background scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen || !batch) return null;

    const totalQty = batch.orders?.reduce((sum: number, o: any) => sum + Number(o.quantity_meters || 0), 0) || 0;
    const uniqueCustomers = Array.from(new Set(batch.orders?.map((o: any) => o.customer_name).filter(Boolean)));
    const hasChallan = !!batch.challan_id;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <h2>
                            Delivery Challan
                            {hasChallan && <span className={styles.badge}>{batch.challan_number}</span>}
                        </h2>
                        <p className={styles.subtitle}>
                            {hasChallan ? 'Generated and ready for dispatch' : 'Challan Pending'}
                        </p>
                    </div>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* CONTENT */}
                <div className={styles.content}>
                    
                    {/* Metadata Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Dispatch Details</h3>
                        <div className={styles.metadataGrid}>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Dispatch No</span>
                                <span className={styles.metaValue}>{batch.dispatch_number}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Date</span>
                                <span className={styles.metaValue}>
                                    {batch.dispatch_date ? new Date(batch.dispatch_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                </span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Vehicle</span>
                                <span className={styles.metaValue}>{batch.vehicle_number || '-'}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Driver</span>
                                <span className={styles.metaValue}>{batch.driver_name || '-'}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Route</span>
                                <span className={styles.metaValue}>{batch.route || 'Local'}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Orders</span>
                                <span className={styles.metaValue}>{batch.orders?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Customers Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Customers ({uniqueCustomers.length})</h3>
                        <div className={styles.fabricCard}>
                            <div className={styles.fabricLeft}>
                                <span className={styles.fabricTitle}>Delivery to:</span>
                                <span className={styles.fabricCustomer}>
                                    {uniqueCustomers.length > 2 
                                        ? `${uniqueCustomers[0]}, ${uniqueCustomers[1]} & ${uniqueCustomers.length - 2} more`
                                        : uniqueCustomers.join(' • ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Fabric Summary */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Fabric Details</h3>
                        <div className={styles.fabricCard}>
                            <div className={styles.fabricLeft}>
                                <span className={styles.fabricTitle}>Total Fabric Loaded</span>
                                <span className={styles.fabricCustomer}>Total quantity across all orders</span>
                            </div>
                            <span className={styles.fabricQty}>{totalQty.toFixed(2)}m</span>
                        </div>
                    </div>

                </div>

                {/* FOOTER ACTIONS */}
                <div className={styles.footer}>
                    {hasChallan ? (
                        <>
                            <button 
                                className={styles.btnSecondary} 
                                onClick={() => {
                                    window.open(`/api/public/challan/${batch.challan_id}/pdf`, '_blank');
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                View
                            </button>
                            <button 
                                className={styles.btnPrimary} 
                                onClick={() => onDownloadPdf(batch.challan_id, batch.challan_number)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download
                            </button>
                            <button 
                                className={styles.btnWhatsApp} 
                                onClick={() => onShareWhatsapp(batch.challan_id, batch)}
                                aria-label="Share via WhatsApp"
                                title="Share via WhatsApp"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                </svg>
                            </button>
                        </>
                    ) : (
                        <div className={styles.loadingWrapper}>
                            <span>No Challan Generated Yet</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
