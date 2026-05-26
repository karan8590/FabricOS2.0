import React, { useState, useEffect } from 'react';
import { X, PackageOpen, ArrowUpRight, ArrowDownRight, Trash2, Box } from 'lucide-react';

interface HistoryRecord {
    id: number;
    action_type: string;
    quantity: number;
    prev_stock: number;
    new_stock: number;
    reason: string;
    linked_order_id?: number;
    user_name?: string;
    vendor_name?: string;
    created_at: number;
    unit_rate?: number;
    total_cost?: number;
}

interface InventoryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    materialId: number;
    materialName: string;
    unit: string;
}

export default function InventoryHistoryModal({ isOpen, onClose, materialId, materialName, unit }: InventoryHistoryModalProps) {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen && materialId) {
            setIsClosing(false);
            fetchHistory();
        }
    }, [isOpen, materialId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_history', materialId })
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data.history || []);
                if (data.summary) {
                    setSummary(data.summary);
                }
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    if (!isOpen) return null;

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleDelete = async (recordId: number) => {
        
        
        setDeletingId(recordId);
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_history', historyId: recordId })
            });
            if (res.ok) {
                setHistory(prev => prev.filter(r => r.id !== recordId));
                if (typeof (window as any).refreshInventory === 'function') {
                    (window as any).refreshInventory();
                }
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to delete record.');
            }
        } catch (error) {
            console.log('An error occurred.');
        } finally {
            setDeletingId(null);
        }
    };

    // Calculate Summary stats from backend (or fallback)
    const totalPurchased = summary?.purchased ?? history.filter(r => r.action_type === 'Purchase').reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalReserved = summary?.reserved ?? history.filter(r => r.action_type === 'Reserved').reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalUsed = summary?.used ?? history.filter(r => ['Used', 'Consumed', 'Consumption'].includes(r.action_type)).reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalProcurementValue = summary?.totalProcurementValue ?? history.filter(r => r.action_type === 'Purchase').reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
    const currentStock = summary?.available ?? (history.length > 0 ? history[0].new_stock : 0);

    const getActionConfig = (action: string) => {
        if (action === 'Purchase') return { bg: '#ECFDF5', color: '#059669', icon: <ArrowDownRight size={18} />, label: 'Purchased' };
        if (action === 'Reserved') return { bg: '#FFF7ED', color: '#EA580C', icon: <PackageOpen size={18} />, label: 'Reserved' };
        if (['Used', 'Consumed', 'Consumption'].includes(action)) return { bg: '#EFF6FF', color: '#2563EB', icon: <ArrowUpRight size={18} />, label: 'Used' };
        if (action === 'Return') return { bg: '#FAF5FF', color: '#9333EA', icon: <ArrowDownRight size={18} />, label: 'Returned' };
        return { bg: '#F1F5F9', color: '#475569', icon: <PackageOpen size={18} />, label: action };
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            opacity: isClosing ? 0 : 1, transition: 'opacity 0.2s ease-out'
        }} onClick={handleClose}>
            
            <div style={{
                background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transform: isClosing ? 'scale(0.98) translateY(10px)' : 'scale(1) translateY(0)', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#F8FAFC' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>{materialName} Inventory</h2>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Centralized stock movement history</p>
                    </div>
                    <button onClick={handleClose} style={{ 
                        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '50%', width: '36px', height: '36px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s ease'
                    }} onMouseEnter={e => e.currentTarget.style.color = '#0F172A'} onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
                        <X size={18} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', padding: '24px 32px', borderBottom: '1px solid #E2E8F0' }}>
                    {[
                        { label: 'Purchased', value: `${totalPurchased}${unit}` },
                        { label: 'Available', value: `${currentStock}${unit}`, color: '#059669' },
                        { label: 'Reserved', value: `${totalReserved}${unit}`, color: '#EA580C' },
                        { label: 'Used', value: `${totalUsed}${unit}`, color: '#2563EB' },
                        { label: 'Inventory Value', value: formatCurrency(totalProcurementValue) }
                    ].map((card, i) => (
                        <div key={i} style={{ 
                            background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 6px 0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: card.color || '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* History List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#F8FAFC' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>Loading history...</div>
                    ) : history.length === 0 ? (
                        <div style={{ padding: '80px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                <span style={{ fontSize: '32px' }}>📦</span>
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>No stock movement history yet</h3>
                            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Procurements and reservations will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {history.map((record) => {
                                const config = getActionConfig(record.action_type);
                                const isPositive = ['Purchase', 'Return'].includes(record.action_type);
                                const canDelete = record.action_type === 'Purchase';

                                return (
                                    <div key={record.id} style={{
                                        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px',
                                        display: 'flex', alignItems: 'center', gap: '20px', transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                                    >
                                        {/* Badge */}
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '10px', background: config.bg, color: config.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {config.icon}
                                        </div>

                                        {/* Details */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                                                    {record.reason}
                                                </span>
                                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 'full', background: '#F1F5F9', color: '#475569' }}>
                                                    {formatDate(record.created_at)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748B' }}>
                                                {record.vendor_name && <span>Vendor: <strong>{record.vendor_name}</strong></span>}
                                                {record.user_name && <span>User: <strong>{record.user_name}</strong></span>}
                                                {record.total_cost > 0 && <span>Value: <strong>{formatCurrency(record.total_cost)}</strong></span>}
                                            </div>
                                        </div>

                                        {/* Quantity & Balance */}
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: isPositive ? '#059669' : (config.color || '#EA580C'), letterSpacing: '-0.02em' }}>
                                                {isPositive ? '+' : '-'}{record.quantity}{unit}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                                                Balance After: {record.new_stock}{unit}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    disabled={deletingId !== null}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '8px',
                                                        cursor: deletingId !== null ? 'not-allowed' : 'pointer', opacity: deletingId === record.id ? 0.5 : 0.6,
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#FEE2E2'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'none'; }}
                                                    title="Delete Manual Procurement"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
