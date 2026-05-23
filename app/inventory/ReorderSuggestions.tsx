import React, { useState, useEffect, useMemo } from 'react';
import styles from './Inventory.module.css';

export default function ReorderSuggestions() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [inkConsumption, setInkConsumption] = useState('0.05');
    const [reorderBuffer, setReorderBuffer] = useState('20');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/reorder');
            if (res.ok) {
                const body = await res.json();
                setData(body);
                setInkConsumption(String(body.settings?.inkConsumptionPerMetre || '0.05'));
                setReorderBuffer(String(body.settings?.reorderBufferPercent || '20'));
            }
        } catch (error) {
            console.error('Failed to load reorder data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inkConsumptionPerMetre: parseFloat(inkConsumption),
                    reorderBufferPercent: parseFloat(reorderBuffer)
                })
            });
            if (res.ok) {
                fetchData(); // Reload data with new settings
            }
        } catch (error) {
            console.error('Error saving settings', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !data) return <div className={styles.loading}>Analyzing order volumes and stock levels...</div>;

    const { totalPendingMetres, pendingOrdersCount, inkSuggestions, packagingSuggestions } = data;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
            <div className={styles.tableCard} style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Reorder Analytics Engine</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Pending Order Volume</div>
                        <div style={{ fontSize: '24px', fontWeight: 700 }}>{totalPendingMetres.toLocaleString('en-IN')} m</div>
                        <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-tertiary)' }}>Across {pendingOrdersCount} pending orders</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Algorithm Settings</div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Liters / Metre</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className={styles.formInput} 
                                    style={{ width: '100px', padding: '6px 12px' }} 
                                    value={inkConsumption}
                                    onChange={(e) => setInkConsumption(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Buffer %</label>
                                <input 
                                    type="number" 
                                    className={styles.formInput} 
                                    style={{ width: '100px', padding: '6px 12px' }} 
                                    value={reorderBuffer}
                                    onChange={(e) => setReorderBuffer(e.target.value)}
                                />
                            </div>
                            <button className={styles.btnAction} onClick={handleSaveSettings} disabled={saving}>
                                {saving ? 'Saving...' : 'Recalculate'}
                            </button>
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', marginTop: '32px' }}>Printing Ink Requirements</h3>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Ink Colour</th>
                                <th>Current Stock</th>
                                <th>Pending Orders Need</th>
                                <th>Suggested Reorder</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inkSuggestions.map((ink: any) => (
                                <tr key={ink.id}>
                                    <td style={{ fontWeight: 600 }}>{ink.ink_colour}</td>
                                    <td>{ink.current_balance} {ink.unit}</td>
                                    <td>{ink.pendingNeed.toFixed(2)} {ink.unit}</td>
                                    <td style={{ fontWeight: 700, color: ink.suggestedReorder > 0 ? '#ff3b30' : 'inherit' }}>
                                        {ink.suggestedReorder} {ink.unit}
                                    </td>
                                    <td>
                                        {ink.suggestedReorder > 0 
                                            ? <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Reorder Needed</span>
                                            : <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Adequate Stock</span>
                                        }
                                    </td>
                                    <td>
                                        {ink.suggestedReorder > 0 && (
                                            <button className={styles.btnAction} onClick={() => alert('Navigate to Add Stock (Ink) for ' + ink.ink_colour)}>+ Add Purchase</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {inkSuggestions.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No ink registered in inventory.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', marginTop: '32px' }}>Packaging Requirements</h3>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Packaging Item</th>
                                <th>Current Stock</th>
                                <th>Pending Need</th>
                                <th>Suggested Reorder</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packagingSuggestions.map((pkg: any) => (
                                <tr key={pkg.id}>
                                    <td style={{ fontWeight: 600 }}>{pkg.item_name} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>({pkg.type})</span></td>
                                    <td>{pkg.current_stock} units</td>
                                    <td>{pkg.pendingNeed} units</td>
                                    <td style={{ fontWeight: 700, color: pkg.suggestedReorder > 0 ? '#ff3b30' : 'inherit' }}>
                                        {pkg.suggestedReorder} units
                                    </td>
                                    <td>
                                        {pkg.suggestedReorder > 0 
                                            ? <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Reorder Needed</span>
                                            : <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Adequate Stock</span>
                                        }
                                    </td>
                                    <td>
                                        {pkg.suggestedReorder > 0 && (
                                            <button className={styles.btnAction} onClick={() => alert('Navigate to Add Stock (Packaging) for ' + pkg.item_name)}>+ Add Purchase</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {packagingSuggestions.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No packaging registered in inventory.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
