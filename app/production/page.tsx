'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Factory, 
    Scissors, 
    Droplets, 
    Printer, 
    Package, 
    FileText, 
    Truck, 
    RefreshCw,
    Check,
    Eye
} from 'lucide-react';
import styles from './Production.module.css';

import QueueCard from '@/components/production/QueueCard';
import BulkActionBar from '@/components/production/BulkActionBar';
import SendToVendorModal from '@/components/orders/SendToVendorModal';
import CreateDispatchModal from '@/components/orders/CreateDispatchModal';

interface ProductionOrder {
    id: number;
    order_number: string;
    customer_name: string;
    design_name: string;
    quantity_meters: number;
    order_stage: string;
    embroidery_status?: string;
    printing_status?: string;
    dyeing_status?: string;
    total_price?: number;
}

function ProductionContent() {
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    
    // Modal states
    const [sendVendorModalOpen, setSendVendorModalOpen] = useState(false);
    const [sendVendorAction, setSendVendorAction] = useState<'send_to_embroidery' | 'send_to_dyeing'>('send_to_embroidery');
    const [sendVendorOrders, setSendVendorOrders] = useState<ProductionOrder[]>([]);
    
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [dispatchOrders, setDispatchOrders] = useState<ProductionOrder[]>([]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'approval';

    // Fetch active production orders
    const fetchOrders = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const res = await fetch('/api/orders?limit=500');
            if (res.ok) {
                const data = await res.json();
                const fetchedOrders = data.orders || data || [];
                setOrders(fetchedOrders);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Helper to change URL query parameter dynamically
    const handleTabChange = (tabName: string) => {
        setSelectedIds([]); // Clear selection when tab changes
        router.replace(`/production?tab=${tabName}`);
    };

    // Filters for each of the 6 queues
    const queues = {
        approval: orders.filter(o => o.order_stage === 'order_added' || !o.order_stage),
        embroidery: orders.filter(o => o.order_stage === 'approved' || o.order_stage === 'embroidery'),
        printing: orders.filter(o => o.order_stage === 'printing'),
        dyeing: orders.filter(o => o.order_stage === 'dyeing'),
        ready: orders.filter(o => o.order_stage === 'ready'),
        delivered: orders.filter(o => ['out_for_delivery', 'delivered', 'invoiced'].includes(o.order_stage))
    };

    const currentTabOrders = queues[activeTab as keyof typeof queues] || [];

    // Multiselect toggles
    const handleSelectToggle = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.length === currentTabOrders.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentTabOrders.map(o => o.id));
        }
    };

    const selectedOrders = currentTabOrders.filter(o => selectedIds.includes(o.id));

    // --- Action Handlers ---

    // 1. Single Primary Swipe Actions
    const handleSinglePrimaryAction = async (order: ProductionOrder) => {
        try {
            if (activeTab === 'approval') {
                // Approve
                const res = await fetch(`/api/orders/${order.id}/workflow`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'approve' })
                });
                if (res.ok) fetchOrders();
                else alert('Failed to approve order');
            } else if (activeTab === 'embroidery') {
                // Mark Printing
                const res = await fetch(`/api/orders/${order.id}/workflow`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark_printing' })
                });
                if (res.ok) fetchOrders();
                else alert('Failed to transition to printing');
            } else if (activeTab === 'printing') {
                // Send to Dyeing (Open vendor assignment modal for single order)
                setSendVendorAction('send_to_dyeing');
                setSendVendorOrders([order]);
                setSendVendorModalOpen(true);
            } else if (activeTab === 'dyeing') {
                // Mark Ready
                const res = await fetch(`/api/orders/${order.id}/workflow`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark_ready' })
                });
                if (res.ok) fetchOrders();
                else alert('Failed to transition to ready');
            } else if (activeTab === 'ready') {
                // Dispatch Modal
                setDispatchOrders([order]);
                setDispatchModalOpen(true);
            } else if (activeTab === 'delivered') {
                // Invoice generate
                if (order.order_stage === 'invoiced') {
                    alert('Invoice already generated');
                    return;
                }
                const res = await fetch('/api/invoices/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: order.id, dueDays: 7 })
                });
                if (res.ok) {
                    fetchOrders();
                    alert('Invoice generated and sent to customer on Telegram.');
                } else {
                    const errData = await res.json();
                    alert(errData.error || 'Failed to generate invoice');
                }
            }
        } catch (err) {
            console.error('Error executing primary action:', err);
        }
    };

    // 2. Single Secondary Swipe Actions
    const handleSingleSecondaryAction = (order: ProductionOrder) => {
        if (activeTab === 'embroidery') {
            // Assign Embroidery Vendor
            setSendVendorAction('send_to_embroidery');
            setSendVendorOrders([order]);
            setSendVendorModalOpen(true);
        } else if (activeTab === 'dyeing') {
            // Assign Dyeing Vendor
            setSendVendorAction('send_to_dyeing');
            setSendVendorOrders([order]);
            setSendVendorModalOpen(true);
        }
    };

    // 3. Bulk Floating Actions
    const handleBulkAction = async (actionName: string) => {
        if (selectedOrders.length === 0) return;

        try {
            setIsBulkSubmitting(true);

            if (actionName === 'bulk_approve') {
                const res = await fetch('/api/orders/bulk-workflow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderIds: selectedIds,
                        action: 'approve'
                    })
                });
                if (res.ok) {
                    setSelectedIds([]);
                    fetchOrders();
                } else {
                    const err = await res.json();
                    alert(err.error || 'Bulk approval failed');
                }
            } else if (actionName === 'bulk_embroidery') {
                setSendVendorAction('send_to_embroidery');
                setSendVendorOrders(selectedOrders);
                setSendVendorModalOpen(true);
            } else if (actionName === 'bulk_dyeing') {
                setSendVendorAction('send_to_dyeing');
                setSendVendorOrders(selectedOrders);
                setSendVendorModalOpen(true);
            } else if (actionName === 'bulk_ready') {
                const res = await fetch('/api/orders/bulk-workflow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderIds: selectedIds,
                        action: 'mark_ready'
                    })
                });
                if (res.ok) {
                    setSelectedIds([]);
                    fetchOrders();
                } else {
                    const err = await res.json();
                    alert(err.error || 'Bulk mark ready failed');
                }
            } else if (actionName === 'bulk_dispatch') {
                setDispatchOrders(selectedOrders);
                setDispatchModalOpen(true);
            } else if (actionName === 'bulk_invoice') {
                // Sequential generation for safety and separate numbers
                let successCount = 0;
                for (const o of selectedOrders) {
                    if (o.order_stage === 'invoiced') continue;
                    try {
                        const res = await fetch('/api/invoices/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId: o.id, dueDays: 7 })
                        });
                        if (res.ok) successCount++;
                    } catch (e) {
                        console.error('Bulk invoice failed for order:', o.id, e);
                    }
                }
                alert(`Invoices created for ${successCount} orders.`);
                setSelectedIds([]);
                fetchOrders();
            }
        } catch (err) {
            console.error('Bulk action error:', err);
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    // Calculate total meters in active workflow
    const activeMetresTotal = orders
        .filter(o => ['embroidery', 'printing', 'dyeing', 'ready'].includes(o.order_stage))
        .reduce((sum, o) => sum + Number(o.quantity_meters || 0), 0);

    const activeOrdersTotal = orders
        .filter(o => ['embroidery', 'printing', 'dyeing', 'ready'].includes(o.order_stage)).length;

    return (
        <div className={styles.container}>
            {/* Page Header */}
            <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                    <div className={styles.headerIcon}>
                        <Factory size={22} />
                    </div>
                    <div className={styles.headerTextGroup}>
                        <h1 className={styles.title}>Production</h1>
                        <p className={styles.subtitle}>
                            {activeOrdersTotal} active orders · {activeMetresTotal.toFixed(0)}m in workflow
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchOrders(true)}
                    disabled={refreshing}
                    className={styles.refreshBtn}
                    aria-label="Refresh orders"
                >
                    <RefreshCw size={16} className={refreshing ? styles.refreshing : ''} />
                </button>
            </div>

            {/* Premium horizontal scrollable tab bar */}
            <div className={styles.tabBarContainer}>
                {[
                    { key: 'approval', label: 'Approval', icon: <Check size={14} /> },
                    { key: 'embroidery', label: 'Embroidery', icon: <Scissors size={14} /> },
                    { key: 'printing', label: 'Printing', icon: <Printer size={14} /> },
                    { key: 'dyeing', label: 'Dyeing', icon: <Droplets size={14} /> },
                    { key: 'ready', label: 'Ready', icon: <Package size={14} /> },
                    { key: 'delivered', label: 'Delivered', icon: <FileText size={14} /> }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`${styles.tabButton} ${activeTab === tab.key ? styles.activeTab : ''}`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        <strong className={styles.tabCounter}>
                            {(queues[tab.key as keyof typeof queues] || []).length}
                        </strong>
                    </button>
                ))}
            </div>

            {/* Select All Checkbox Panel */}
            {currentTabOrders.length > 0 && (
                <div className={styles.selectAllPanel}>
                    <div className={styles.selectAllLabel} onClick={handleSelectAllToggle}>
                        <div className={`${styles.checkbox} ${selectedIds.length === currentTabOrders.length ? styles.checkboxSelected : ''}`}>
                            {selectedIds.length === currentTabOrders.length && <Check size={12} color="#FFF" strokeWidth={3} />}
                        </div>
                        <span>Select All ({currentTabOrders.length})</span>
                    </div>
                    {selectedIds.length > 0 && (
                        <span className={styles.listMetersSum}>
                            Selected: {selectedOrders.reduce((sum, o) => sum + Number(o.quantity_meters || 0), 0).toFixed(1)}m
                        </span>
                    )}
                </div>
            )}

            {/* Content Body */}
            {loading ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                    <span>Loading workflow queues...</span>
                </div>
            ) : currentTabOrders.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🏭</div>
                    <h3 className={styles.emptyTitle}>Queue Fulfillled</h3>
                    <p className={styles.emptyText}>No orders currently in the {activeTab} queue.</p>
                    <button
                        onClick={() => router.push('/orders')}
                        className={styles.emptyAction}
                    >
                        View All Orders
                    </button>
                </div>
            ) : (
                <div className={styles.cardList}>
                    {currentTabOrders.map(order => (
                        <QueueCard
                            key={order.id}
                            order={order}
                            isSelected={selectedIds.includes(order.id)}
                            onSelectToggle={() => handleSelectToggle(order.id)}
                            activeTab={activeTab}
                            onPrimaryAction={handleSinglePrimaryAction}
                            onSecondaryAction={handleSingleSecondaryAction}
                            onViewDetails={(id) => router.push(`/orders/${id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
                selectedOrders={selectedOrders}
                activeTab={activeTab}
                onClearSelection={() => setSelectedIds([])}
                onBulkAction={handleBulkAction}
                isSubmitting={isBulkSubmitting}
            />

            {/* Modals from existing app codebase */}
            {sendVendorModalOpen && (
                <SendToVendorModal
                    isOpen={sendVendorModalOpen}
                    onClose={() => setSendVendorModalOpen(false)}
                    onSuccess={() => {
                        setSendVendorModalOpen(false);
                        setSelectedIds([]);
                        fetchOrders();
                    }}
                    orders={sendVendorOrders}
                    action={sendVendorAction}
                />
            )}

            {dispatchModalOpen && (
                <CreateDispatchModal
                    isOpen={dispatchModalOpen}
                    onClose={() => setDispatchModalOpen(false)}
                    onSuccess={() => {
                        setDispatchModalOpen(false);
                        setSelectedIds([]);
                        fetchOrders();
                    }}
                    selectedOrders={dispatchOrders}
                />
            )}
        </div>
    );
}

export default function ProductionPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', color: '#9CA3AF' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(0,0,0,0.05)', borderTopColor: '#0071E3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
                <span>Loading workflow hub...</span>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <ProductionContent />
        </Suspense>
    );
}
