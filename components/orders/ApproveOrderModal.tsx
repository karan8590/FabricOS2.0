import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertTriangle, Box, Package } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css';
import { getAvailableInventory } from '@/lib/inventory';

interface ApproveOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: any;
    onEdit?: (order: any) => void;
}

export default function ApproveOrderModal({ isOpen, onClose, onSuccess, order, onEdit }: ApproveOrderModalProps) {
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableInventory, setAvailableInventory] = useState<number>(0);
    const [isLoadingInventory, setIsLoadingInventory] = useState(true);
    const [inventoryError, setInventoryError] = useState('');
    const [globalError, setGlobalError] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && order) {
            setGlobalError('');
            setIsSubmitting(false);
            fetchInventory();
        }
    }, [isOpen, order]);

    const fetchInventory = async () => {
        setIsLoadingInventory(true);
        setInventoryError('');
        try {
            const res = await fetch('/api/inventory?category=Fabric');
            const data = await res.json();
            if (data.data) {
                const targetFabric = order.fabric_type || 'Polyester';
                const matchingFabric = data.data.filter((m: any) => m.name === targetFabric);
                const totalAvail = matchingFabric.reduce((sum: number, m: any) => sum + getAvailableInventory(m), 0);
                setAvailableInventory(totalAvail);
            }
        } catch (err) {
            setInventoryError('Failed to fetch inventory.');
        } finally {
            setIsLoadingInventory(false);
        }
    };

    if (!isOpen || !order || !mounted) return null;

    const requiredFabric = Number(order.quantity_meters || 0);
    const remainingFabric = availableInventory - requiredFabric;
    const isSufficient = availableInventory >= requiredFabric;

    const handleApprove = async () => {
        if (!isSufficient) {
            console.log('Not enough inventory available');
            return;
        }

        setIsSubmitting(true);
        setGlobalError('');

        try {
            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });
            const data = await res.json();
            if (res.ok) {
                // Silent success - rely on UI refresh via onSuccess
                onSuccess();
            } else {
                setGlobalError(data.error || 'Failed to approve order');
                setIsSubmitting(false);
            }
        } catch (error: any) {
            setGlobalError(error.message || 'Network error');
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={!isSubmitting ? onClose : undefined}>
            <div 
                className={styles.modalContent} 
                style={{ 
                    maxWidth: '560px', 
                    borderRadius: '16px', 
                    padding: 0, 
                    overflow: 'hidden', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF'
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ background: '#FFFBEB', color: '#D97706', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(217,119,6,0.1)' }}>
                            <CheckCircle2 size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Approve Order</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>Reserve inventory and move order into production</p>
                        </div>
                    </div>
                    <button 
                        style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s', marginTop: '4px' }} 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#4B5563'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#FAFAFA' }}>
                    {globalError && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} /> {globalError}
                        </div>
                    )}
                    
                    {/* Order Summary */}
                    <div>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Package size={14} color="#9CA3AF" /> ORDER SUMMARY
                        </h3>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Order ID</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{order.order_number || `ORD-${order.id}`}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Customer</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{order.customer_name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Design</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{order.design_name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Quantity</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{order.quantity_meters}m</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', paddingTop: '14px', borderTop: '1px dashed #E5E7EB', marginTop: '4px', alignItems: 'center' }}>
                                <span style={{ color: '#4B5563', fontWeight: 500 }}>Total Value</span>
                                <span style={{ fontWeight: 700, color: '#111827', fontSize: '16px' }}>₹{Number(order.total_price || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Fabric Reservation */}
                    <div>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Box size={14} color="#9CA3AF" /> FABRIC RESERVATION
                        </h3>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Fabric Type</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{order.fabric_type || 'Polyester'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Available Inventory</span>
                                <span style={{ fontWeight: 600, color: '#4B5563' }}>
                                    {isLoadingInventory ? 'Loading...' : `${availableInventory}m`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280' }}>Required Fabric</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{requiredFabric}m</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '14px', borderTop: '1px dashed #E5E7EB', marginTop: '4px', alignItems: 'center' }}>
                                <span style={{ color: '#4B5563', fontWeight: 500 }}>Remaining After Approval</span>
                                <span style={{ fontWeight: 700, color: remainingFabric < 0 ? '#DC2626' : '#16A34A', fontSize: '15px' }}>
                                    {isLoadingInventory ? '...' : `${remainingFabric}m`}
                                </span>
                            </div>
                        </div>
                        
                        {!isLoadingInventory && (
                            <div style={{ marginTop: '20px' }}>
                                {isSufficient ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F0FDF4', color: '#15803D', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(22,163,74,0.15)', fontSize: '14px', fontWeight: 500 }}>
                                        <CheckCircle2 size={18} strokeWidth={2.5} /> Inventory verified and safe to reserve
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FEF2F2', color: '#B91C1C', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(220,38,38,0.15)', fontSize: '14px', fontWeight: 500 }}>
                                        <AlertTriangle size={18} strokeWidth={2.5} /> Insufficient inventory to fulfill order
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', background: '#FFFFFF', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        type="button"
                        onClick={onClose}
                        style={{ padding: '10px 16px', background: 'transparent', border: '1px solid transparent', color: '#6B7280', fontWeight: 500, fontSize: '14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        disabled={isSubmitting}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
                    >
                        Cancel
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {onEdit && (
                            <button 
                                type="button" 
                                onClick={() => onEdit(order)}
                                style={{ padding: '10px 20px', background: '#FFFFFF', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 500, fontSize: '14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                disabled={isSubmitting}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                            >
                                Edit Order
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={handleApprove}
                            className={styles.btnAmber}
                            disabled={isSubmitting || !isSufficient || isLoadingInventory}
                        >
                            {isSubmitting ? 'Approving...' : 'Approve & Reserve Fabric'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
