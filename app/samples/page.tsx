'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './Samples.module.css';
import StatWidget from '@/components/ui/StatWidget';

interface Sample {
    id: number;
    date: string;
    party_name: string;
    design_name: string;
    courier_name: string;
    awb_number: string;
    status: string;
    cost: number;
}

export default function SamplesPage() {
    const [samples, setSamples] = useState<Sample[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        party_name: '',
        design_name: '',
        courier_name: '',
        awb_number: '',
        status: 'Dispatched',
        cost: ''
    });

    useEffect(() => {
        fetchSamples();
    }, []);

    const fetchSamples = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/samples');
            if (res.ok) {
                const data = await res.json();
                setSamples(data.samples || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, cost: Number(form.cost) })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    date: new Date().toISOString().split('T')[0],
                    party_name: '',
                    design_name: '',
                    courier_name: '',
                    awb_number: '',
                    status: 'Dispatched',
                    cost: ''
                });
                fetchSamples();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            const res = await fetch('/api/samples', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (res.ok) {
                fetchSamples();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const stats = useMemo(() => {
        const total = samples.length;
        const thisMonth = samples.filter(s => {
            const d = new Date(s.date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        const totalCost = samples.reduce((acc, curr) => acc + curr.cost, 0);
        return { total, thisMonth, totalCost };
    }, [samples]);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Sample Register</h1>
                <p className={styles.subtitle}>Track physical samples dispatched to clients</p>
            </div>

            <div className={styles.widgetRow}>
                <StatWidget
                    label="Total Samples Sent"
                    value={stats.total}
                    accentColor="#0071E3"
                    accentBg="rgba(0,113,227,0.04)"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
                />
                <StatWidget
                    label="Samples This Month"
                    value={stats.thisMonth}
                    accentColor="#AF52DE"
                    accentBg="rgba(175,82,222,0.04)"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                />
                <StatWidget
                    label="Courier Investment"
                    value={`₹${stats.totalCost.toLocaleString('en-IN')}`}
                    accentColor="#34C759"
                    accentBg="rgba(52,199,89,0.04)"
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
                />
            </div>

            <div className={styles.actionsRow}>
                <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Sample
                </button>
            </div>

            <div className={styles.tableCard}>
                {loading ? (
                    <div className={styles.loading}>Loading samples...</div>
                ) : samples.length === 0 ? (
                    <div className={styles.emptyState}>No samples recorded yet.</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Party Name</th>
                                    <th>Design Name</th>
                                    <th>Courier Partner</th>
                                    <th>AWB Tracking</th>
                                    <th>Courier Cost</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {samples.map(sample => (
                                    <tr key={sample.id}>
                                        <td>{sample.date}</td>
                                        <td style={{ fontWeight: 600 }}>{sample.party_name}</td>
                                        <td>{sample.design_name}</td>
                                        <td>{sample.courier_name}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{sample.awb_number || '—'}</td>
                                        <td>₹{sample.cost}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${
                                                sample.status === 'Dispatched' ? styles.statusDispatched : 
                                                sample.status === 'Delivered' ? styles.statusDelivered : 
                                                sample.status === 'Rejected' ? styles.statusRejected : styles.statusPending
                                            }`}>
                                                {sample.status}
                                            </span>
                                        </td>
                                        <td>
                                            {sample.status === 'Dispatched' && (
                                                <button className={styles.btnAction} onClick={() => updateStatus(sample.id, 'Delivered')}>
                                                    Mark Delivered
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>Log New Sample</div>
                        <form onSubmit={handleSave}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup} style={{ padding: 0, marginTop: 0 }}>
                                    <label>Date</label>
                                    <input type="date" className={styles.formInput} required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                                </div>
                                <div className={styles.formGroup} style={{ padding: 0, marginTop: 0 }}>
                                    <label>Status</label>
                                    <select className={styles.formSelect} required value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                        <option value="Pending">Pending</option>
                                        <option value="Dispatched">Dispatched</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label>Party Name</label>
                                <input type="text" className={styles.formInput} required placeholder="e.g. Acme Corp" value={form.party_name} onChange={e => setForm({...form, party_name: e.target.value})} />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Design Name</label>
                                <input type="text" className={styles.formInput} required placeholder="e.g. Floral Print 43" value={form.design_name} onChange={e => setForm({...form, design_name: e.target.value})} />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup} style={{ padding: 0, marginTop: 0 }}>
                                    <label>Courier Name</label>
                                    <input type="text" className={styles.formInput} required placeholder="e.g. DTDC, BlueDart" value={form.courier_name} onChange={e => setForm({...form, courier_name: e.target.value})} />
                                </div>
                                <div className={styles.formGroup} style={{ padding: 0, marginTop: 0 }}>
                                    <label>Courier Cost (₹)</label>
                                    <input type="number" className={styles.formInput} required min="0" placeholder="e.g. 150" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>AWB / Tracking Number (Optional)</label>
                                <input type="text" className={styles.formInput} placeholder="e.g. 1Z9999999999999999" value={form.awb_number} onChange={e => setForm({...form, awb_number: e.target.value})} />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className={styles.btnSubmit}>Save Sample</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
