'use client';

import React, { useState, useEffect } from 'react';
import styles from './Inventory.module.css';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface Suggestion {
    id: number;
    name: string;
    category: string;
    available: number;
    reserved: number;
    minStock: number;
    avgWeeklyUsage: number;
    daysRemaining: number;
    suggestedReorder: number;
    vendorName: string;
    priority: 'Critical' | 'Warning' | 'Healthy';
}

export default function ReorderSuggestions() {
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [totalPending, setTotalPending] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/reorder', { cache: 'no-store' });
            if (res.ok) {
                const body = await res.json();
                setSuggestions(body.suggestions || []);
                setTotalPending(body.totalPendingMetres || 0);
            }
        } catch (error) {
            console.error('Failed to load reorder data', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Analyzing order volumes and stock levels...</div>;

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div style={{ marginTop: '40px' }}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title} style={{ fontSize: '22px' }}>Reorder Intelligence</h2>
                    <p className={styles.subtitle}>Smart stock replenishment suggestions based on active reservations and usage velocity</p>
                </div>
            </div>

            <div className={styles.cardsGrid}>
                {suggestions.map(item => (
                    <div key={item.id} className={styles.materialCard} style={{ borderTop: `4px solid ${item.priority === 'Critical' ? '#ef4444' : '#f59e0b'}` }}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitleGroup}>
                                <span className={styles.cardTitle}>{item.name}</span>
                                <span className={styles.cardSubtitle}>{item.category} • {item.vendorName}</span>
                            </div>
                            <div className={styles.badge} style={{
                                background: item.priority === 'Critical' ? '#FEF2F2' : '#FFFBEB',
                                color: item.priority === 'Critical' ? '#B91C1C' : '#D97706'
                            }}>
                                {item.priority === 'Critical' ? <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} /> : <TrendingDown size={12} style={{ display: 'inline', marginRight: 4 }} />}
                                {item.priority}
                            </div>
                        </div>

                        <div className={styles.metersContainer} style={{ background: item.priority === 'Critical' ? '#fef2f2' : '#fffbeb' }}>
                            <div className={styles.meterRow}>
                                <span className={styles.meterLabel}>Current Stock</span>
                                <span className={styles.meterValue}>{item.available}</span>
                            </div>
                            <div className={styles.meterRow}>
                                <span className={styles.meterLabel}>Reserved Stock</span>
                                <span className={styles.meterValue}>{item.reserved}</span>
                            </div>
                            <div className={styles.meterRow}>
                                <span className={styles.meterLabel}>Avg Weekly Usage</span>
                                <span className={styles.meterValue}>{item.avgWeeklyUsage}</span>
                            </div>
                            <div className={styles.meterRow} style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className={styles.meterLabel}>Est. Days Remaining</span>
                                <span className={styles.meterValue} style={{ color: item.daysRemaining <= 7 ? '#ef4444' : 'inherit' }}>
                                    {item.daysRemaining > 99 ? '99+' : item.daysRemaining} Days
                                </span>
                            </div>
                        </div>

                        <div className={styles.cardFooter}>
                            <div className={styles.footerMeta}>
                                <span className={styles.footerLabel}>Suggested Reorder</span>
                                <span className={styles.footerValue} style={{ color: 'var(--accent)' }}>{item.suggestedReorder} Units</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
