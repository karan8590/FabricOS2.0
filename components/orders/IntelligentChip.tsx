'use client';

import React, { useState } from 'react';
import { Scissors, Droplets } from 'lucide-react';
import styles from './IntelligentChip.module.css';
import { useRouter } from 'next/navigation';

export default function IntelligentChip({ type, jobCosts, orderId, onClickChip }: { type: 'embroidery' | 'dyeing', jobCosts: any[], orderId: string, onClickChip?: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const router = useRouter();

    const jobs = jobCosts?.filter((jc: any) => jc.type === type) || [];
    
    // Determine type class
    const typeClass = type === 'embroidery' ? styles.chipEmbroidery : styles.chipDyeing;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (onClickChip) {
            onClickChip();
        } else {
            router.push(`/orders/${orderId}`);
        }
    };

    return (
        <div 
            className={styles.chipContainer}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <div className={`${styles.chip} ${typeClass}`}>
                {type === 'embroidery' ? 'E' : 'D'}
            </div>

            <div className={`${styles.popoverWrapper} ${isHovered ? styles.popoverVisible : ''}`}>
                <div className={styles.tooltipCard}>
                    <div className={styles.tooltipHeader}>
                        {type === 'embroidery' ? <Scissors size={14} color="#9333EA"/> : <Droplets size={14} color="#D97706"/>}
                        {type === 'embroidery' ? 'Embroidery Outsourcing' : 'Dyeing Outsourcing'}
                    </div>

                    <div className={styles.tooltipContent}>
                        {jobs.length === 0 ? (
                            <div className={styles.emptyState}>No costs added yet</div>
                        ) : (
                            jobs.map((job: any, index: number) => (
                                <React.Fragment key={job.id || index}>
                                    <div className={styles.tooltipRow}>
                                        <span className={styles.tooltipLabel}>Vendor</span>
                                        <span className={styles.tooltipValue} title={job.vendor_name}>{job.vendor_name || 'N/A'}</span>
                                    </div>
                                    <div className={styles.tooltipRow}>
                                        <span className={styles.tooltipLabel}>Rate</span>
                                        <span className={styles.tooltipValue}>₹{job.rate_per_metre} / meter</span>
                                    </div>
                                    <div className={styles.tooltipRow}>
                                        <span className={styles.tooltipLabel}>Meters</span>
                                        <span className={styles.tooltipValue}>{job.metres}m</span>
                                    </div>
                                    <div className={`${styles.tooltipRow} ${styles.totalRow}`}>
                                        <span className={styles.tooltipLabel}>Total</span>
                                        <span className={styles.totalValue}>₹{job.total_cost?.toLocaleString('en-IN')}</span>
                                    </div>
                                    {job.expected_return_date && (
                                        <div className={styles.tooltipRow} style={{ marginTop: '4px' }}>
                                            <span className={styles.tooltipLabel}>Exp. Return</span>
                                            <span className={styles.tooltipValue} style={{ fontSize: '12px', color: '#4B5563' }}>
                                                {new Date(job.expected_return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    )}
                                    <div className={styles.statusRow}>
                                        <span className={styles.statusBadgeGreen}>
                                            {job.dispatch_status === 'sent' ? 'Sent' : job.dispatch_status === 'returned' ? 'Returned' : 'Cost Added'}
                                        </span>
                                    </div>
                                    {index < jobs.length - 1 && <hr className={styles.divider} />}
                                </React.Fragment>
                            ))
                        )}
                    </div>
                    <div className={styles.arrow} />
                </div>
            </div>
        </div>
    );
}
