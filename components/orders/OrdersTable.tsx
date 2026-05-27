import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    MoreHorizontal, Eye, Edit2, Copy, FileText, 
    CheckCircle2, Trash2, AlertTriangle, Truck, X, QrCode, Printer,
    MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './OrdersTable.module.css';
import { createPortal } from 'react-dom';
import MobileOrderCard, { isEligibleForBulkAction } from './MobileOrderCard';
import IntelligentChip from './IntelligentChip';
import CreateDispatchModal from './CreateDispatchModal';
import SendToVendorModal from './SendToVendorModal';
import CompletePrintingModal from './CompletePrintingModal';
import ConfirmReceivedModal from './ConfirmReceivedModal';
import DispatchOrderModal from './DispatchOrderModal';
import ConfirmDeliveryModal from './ConfirmDeliveryModal';
import PrintQRModal from './PrintQRModal';
import ApproveOrderModal from './ApproveOrderModal';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

// isEligibleForBulkAction is imported from MobileOrderCard.tsx

interface OrdersTableProps {
    orders: any[];
    onUpdate: () => void;
    onGenerateInvoice: (order: any) => void;
    onEdit?: (order: any) => void;
    activeWidget: string | null;
    selectedIds?: Set<number>;
    onToggleSelect?: (id: number) => void;
    onClearSelection?: () => void;
    selectedOrderId?: number;
    onSelectOrder?: (id: number) => void;
    hasActiveOverlay?: boolean;
    sortOrder?: 'desc' | 'asc';
    onSortToggle?: () => void;
}

const OrderTableRow = React.memo(({ 
    order, 
    onUpdate, 
    onGenerateInvoice, 
    onEdit, 
    onWorkflowAction,
    highlightClass, 
    handleCustomerClick,
    isSelected,
    onToggleSelect,
    setIsCompletePrintingModalOpen,
    setSelectedOrderForPrinting,
    selectedOrderId,
    onSelectOrder
}: { 
    order: any; 
    onUpdate: () => void; 
    onGenerateInvoice: (order: any) => void; 
    onEdit?: (order: any) => void;
    onWorkflowAction: (action: string, order: any) => void; 
    highlightClass: string; 
    handleCustomerClick: (id: number) => void; 
    isSelected?: boolean;
    onToggleSelect?: (id: number) => void;
    setIsCompletePrintingModalOpen: (val: boolean) => void;
    setSelectedOrderForPrinting: (order: any) => void;
    selectedOrderId?: number;
    onSelectOrder?: (id: number) => void;
}) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const orderStage = order.order_stage || 'order_added';
    

    
    const now = Math.floor(Date.now() / 1000);
    const isFinished = orderStage === 'delivered';
    const isPending = orderStage === 'order_added';
    const isInProduction = ['approved', 'embroidery', 'printing', 'dyeing', 'ready', 'out_for_delivery'].includes(orderStage);
    
    const effectiveDate = order.order_date || order.created_at;
    const deliveryDeadline = effectiveDate + (7 * 24 * 60 * 60);
    const isOverdue = !isFinished && now > deliveryDeadline;
    const orderDate = new Date(effectiveDate * 1000);

    let rowStatusClass = '';
    if (isFinished) rowStatusClass = styles.rowCompleted;
    else if (isOverdue) rowStatusClass = styles.rowOverdue;
    else if (isInProduction) rowStatusClass = styles.rowInProduction;
    else if (isPending) rowStatusClass = styles.rowPending;

    const isReady = orderStage === 'ready';

    return (
        <tr 
            className={`${styles.tr} ${rowStatusClass} ${highlightClass} ${isSelected ? styles.rowSelected : ''} ${selectedOrderId === order.id ? styles.rowActiveDetail : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                if (onSelectOrder) {
                    onSelectOrder(order.id);
                }
            }}
            style={onSelectOrder ? { cursor: 'pointer' } : undefined}
        >
            <td className={styles.tdCheckbox}>
                {isEligibleForBulkAction(order) && (
                    <input 
                        type="checkbox"
                        className={styles.rowCheckbox}
                        checked={isSelected || false}
                        onChange={() => onToggleSelect?.(order.id)}
                        onClick={e => e.stopPropagation()}
                    />
                )}
            </td>
            <td className={styles.td}>
                <div className={styles.orderIdCell}>
                    <div className={styles.orderNumber}>
                        {order.is_recurring ? <span style={{color: '#AF52DE', marginRight: '4px', fontWeight: 'bold'}} title="Recurring Order">↻</span> : null}
                        {order.order_number || `ORD-${order.id}`}
                        {(order.job_costs?.length > 0 || order.embroidery_job_cost > 0 || order.dyeing_job_cost > 0) && (
                            <span className={styles.jobBadges}>
                                {(order.job_costs?.some((jc: any) => jc.type === 'embroidery') || order.embroidery_job_cost > 0) && (
                                    <IntelligentChip type="embroidery" jobCosts={order.job_costs || []} orderId={order.id?.toString()} />
                                )}
                                {(order.job_costs?.some((jc: any) => jc.type === 'dyeing') || order.dyeing_job_cost > 0) && (
                                    <IntelligentChip type="dyeing" jobCosts={order.job_costs || []} orderId={order.id?.toString()} />
                                )}
                            </span>
                        )}
                        {order.is_recurring && order.recurring_next_due && (
                            <div style={{fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'normal', marginTop: '2px'}}>
                                Next draft: {new Date(order.recurring_next_due * 1000).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                    <div className={styles.orderDate}>
                        {orderDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </div>
                </div>
            </td>
            <td className={styles.td}>
                <div className={styles.customerCell} onClick={(e) => { e.stopPropagation(); handleCustomerClick(order.customer_id); }} style={{ cursor: 'pointer' }}>
                    <div className={styles.customerName}>{order.customer_name}</div>
                    <div className={styles.phone}>{order.customer_phone}</div>
                </div>
            </td>
            <td className={styles.td}>
                <div className={styles.design}>{order.design_name}</div>
            </td>
            <td className={styles.td}>
                <div className={styles.quantity}>{order.quantity_meters}m</div>
            </td>
            <td className={styles.td}>
                <div className={styles.total}>
                    ₹{order.total_price.toLocaleString('en-IN')}
                </div>
            </td>
            <td className={styles.actionsCell}>
                <div className={styles.actionsWrapper} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                    {order.invoice_generated ? (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(52,199,89,0.08)', color: '#34C759',
                            padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        }}>
                            <CheckCircle2 size={12} /> Invoice Generated
                        </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                        <OrderActionButton 
                            order={order} 
                            onUpdate={onUpdate} 
                            onWorkflowAction={(action) => onWorkflowAction(action, order)}
                            setIsCompletePrintingModalOpen={setIsCompletePrintingModalOpen}
                            setSelectedOrderForPrinting={setSelectedOrderForPrinting}
                        />
                        <OrderActionMenu 
                            order={order} 
                            onUpdate={onUpdate} 
                            onGenerateInvoice={onGenerateInvoice} 
                            onEdit={onEdit}
                        />
                    </div>
                </div>
            </td>
        </tr>
    );
});
OrderTableRow.displayName = 'OrderTableRow';

const OrderMobileCard = React.memo(({ 
    order, 
    onUpdate, 
    onGenerateInvoice, 
    onEdit, 
    onWorkflowAction,
    highlightClass, 
    handleCustomerClick,
    setIsCompletePrintingModalOpen,
    setSelectedOrderForPrinting
}: { 
    order: any; 
    onUpdate: () => void; 
    onGenerateInvoice: (order: any) => void; 
    onEdit?: (order: any) => void;
    onWorkflowAction: (action: string, order: any) => void; 
    highlightClass: string; 
    handleCustomerClick: (id: number) => void;
    setIsCompletePrintingModalOpen: (val: boolean) => void;
    setSelectedOrderForPrinting: (order: any) => void;
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const status = order.status?.toLowerCase() || ORDER_STATUSES.CREATED;
    const now = Math.floor(Date.now() / 1000);
    const isFinished = status === 'completed' || status === 'invoiced' || (status === ORDER_STATUSES.DELIVERED && order.invoice_generated);
    const isPending = status === ORDER_STATUSES.CREATED;
    const isInProduction = [ORDER_STATUSES.APPROVED, ORDER_STATUSES.EMBROIDERY, ORDER_STATUSES.PRINTING, ORDER_STATUSES.DYEING, ORDER_STATUSES.READY, ORDER_STATUSES.DISPATCHED].includes(status);
    
    const effectiveDate = order.order_date || order.created_at;
    const deliveryDeadline = effectiveDate + (7 * 24 * 60 * 60);
    const isOverdue = !isFinished && now > deliveryDeadline;
    const orderDate = new Date(effectiveDate * 1000);

    let rowStatusClass = '';
    if (isFinished) rowStatusClass = styles.rowCompleted;
    else if (isOverdue) rowStatusClass = styles.rowOverdue;
    else if (isInProduction) rowStatusClass = styles.rowInProduction;
    else if (isPending) rowStatusClass = styles.rowPending;

    return (
        <div 
            className={`${styles.mobileCard} ${rowStatusClass} ${highlightClass}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={styles.mobileCardTopRow}>
                <span className={styles.mobileStatusBadge}>
                    {ORDER_STATUS_LABELS[status] || 'Pending'}
                </span>
                <span className={styles.mobilePrice}>
                    ₹{order.total_price.toLocaleString('en-IN')}
                </span>
            </div>

            <div className={styles.mobileCardSecondRow} onClick={() => handleCustomerClick(order.customer_id)}>
                {order.customer_name}
            </div>

            <div className={styles.mobileCardHeader}>
                <div className={styles.orderNumber}>
                    {order.is_recurring ? <span style={{color: '#AF52DE', marginRight: '4px', fontWeight: 'bold'}} title="Recurring Order">↻</span> : null}
                    {order.order_number || `ORD-${order.id}`}
                </div>
                {order.is_recurring && order.recurring_next_due && (
                    <div style={{fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px'}}>
                        Next draft: {new Date(order.recurring_next_due * 1000).toLocaleDateString()}
                    </div>
                )}
            </div>
            
            <div className={styles.mobileCardThirdRow}>
                <span className={styles.mobileOrderId}>
                    {(order.job_costs?.length > 0 || order.embroidery_job_cost > 0 || order.dyeing_job_cost > 0) && (
                        <span className={styles.jobBadges}>
                            {(order.job_costs?.some((jc: any) => jc.type === 'embroidery') || order.embroidery_job_cost > 0) && (
                                <IntelligentChip type="embroidery" jobCosts={order.job_costs || []} orderId={order.id?.toString()} />
                            )}
                            {(order.job_costs?.some((jc: any) => jc.type === 'dyeing') || order.dyeing_job_cost > 0) && (
                                <IntelligentChip type="dyeing" jobCosts={order.job_costs || []} orderId={order.id?.toString()} />
                            )}
                        </span>
                    )}
                </span>
                <span className={styles.mobileDot}>•</span>
                <span className={styles.mobileQuantity}>{order.quantity_meters}m</span>
            </div>

            <div className={styles.mobileCardFourthRow}>
                {order.design_name}
            </div>

            <div className={styles.mobileCardBottomRow}>
                <div className={styles.mobileDate}>
                    {orderDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    })}
                </div>
                <div className={styles.mobileActionsContainer} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
                    {order.invoice_generated ? (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(52,199,89,0.08)', color: '#34C759',
                            padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        }}>
                            <CheckCircle2 size={12} /> Invoiced
                        </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                        <OrderActionButton 
                            order={order} 
                            onUpdate={onUpdate} 
                            onWorkflowAction={(action) => onWorkflowAction(action, order)}
                            setIsCompletePrintingModalOpen={setIsCompletePrintingModalOpen}
                            setSelectedOrderForPrinting={setSelectedOrderForPrinting}
                        />
                        <OrderActionMenu 
                            order={order} 
                            onUpdate={onUpdate} 
                            onGenerateInvoice={onGenerateInvoice} 
                            onEdit={onEdit}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});
OrderMobileCard.displayName = 'OrderMobileCard';



export default function OrdersTable({ orders, onUpdate, onGenerateInvoice, onEdit, activeWidget, selectedIds, onToggleSelect, onClearSelection, selectedOrderId, onSelectOrder, hasActiveOverlay, sortOrder, onSortToggle }: OrdersTableProps) {
    const router = useRouter();

    useEffect(() => {
        // Prefetch inventory in the background when the table renders
        import('@/lib/inventoryCache').then(mod => {
            mod.prefetchFabricInventory();
        }).catch(err => console.error(err));
    }, []);

    const [workflowActionState, setWorkflowActionState] = useState<{isOpen: boolean, action: string, order: any}>({isOpen: false, action: '', order: null});
    
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [isCompletePrintingModalOpen, setIsCompletePrintingModalOpen] = useState(false);
    const [selectedOrderForPrinting, setSelectedOrderForPrinting] = useState<any>(null);
    const rowsPerPage = 50;
    const [currentPage, setCurrentPage] = useState(1);

    const localHasActiveOverlay = workflowActionState.isOpen || showDispatchModal || isCompletePrintingModalOpen;
    const isOverlayActive = hasActiveOverlay || localHasActiveOverlay;

    useEffect(() => {
        // Keep the modal's order reference up-to-date if the parent re-fetches
        if (workflowActionState.isOpen && workflowActionState.order) {
            const updatedOrder = orders.find((o: any) => o.id === workflowActionState.order.id);
            if (updatedOrder && JSON.stringify(updatedOrder) !== JSON.stringify(workflowActionState.order)) {
                setWorkflowActionState(prev => ({ ...prev, order: updatedOrder }));
            }
        }
    }, [orders, workflowActionState.isOpen, workflowActionState.order]);

    const handleCustomerClick = React.useCallback((customerId: number) => {
        router.push(`/customers/${customerId}`);
    }, [router]);

    const getHighlightClass = () => {
        if (!activeWidget) return '';
        switch (activeWidget) {
            case 'total': return styles.highlightTotal;
            case 'revenue': return styles.highlightRevenue;
            case 'pending': return styles.highlightPending;
            case 'production': return styles.highlightProduction;
            case 'overdue': return styles.highlightOverdue;
            default: return '';
        }
    };

    const highlightClass = getHighlightClass();

    const readyOrders = orders.filter(o => isEligibleForBulkAction(o));
    
    const allReadySelected = readyOrders.length > 0 && readyOrders.every(o => selectedIds?.has(o.id));

    const toggleSelectAll = () => {
        if (!onToggleSelect) return;
        if (allReadySelected) {
            readyOrders.forEach(o => selectedIds?.has(o.id) && onToggleSelect(o.id));
        } else {
            readyOrders.forEach(o => !selectedIds?.has(o.id) && onToggleSelect(o.id));
        }
    };

    const selectedOrders = orders.filter(o => selectedIds?.has(o.id));

    const needsPagination = false; // Disabled internal pagination in favor of infinite scrolling in page.tsx
    const startIndex = 0;
    const endIndex = orders.length;
    const paginatedOrders = orders;
    const totalPages = Math.ceil(orders.length / rowsPerPage);

    const closeWorkflowModal = () => setWorkflowActionState({isOpen: false, action: '', order: null});

    const handleModalSuccess = () => {
        closeWorkflowModal();
        if (onClearSelection) onClearSelection();
        onUpdate();
    };


    return (
        <div className={styles.tableContainer}>
            {/* Vendor Modals */}
            <ApproveOrderModal
                isOpen={workflowActionState.isOpen && workflowActionState.action === 'approve'}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order || selectedOrders[0]}
                onEdit={onEdit}
            />
            <SendToVendorModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'send_to_embroidery' || workflowActionState.action === 'send_to_dyeing')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                orders={workflowActionState.order ? [workflowActionState.order] : selectedOrders}
                action={workflowActionState.action as any}
            />
            <ConfirmReceivedModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'mark_printing' || workflowActionState.action === 'mark_ready')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order || selectedOrders[0]}
                action={workflowActionState.action as any}
            />
            <DispatchOrderModal
                isOpen={workflowActionState.isOpen && workflowActionState.action === 'dispatch'}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order || selectedOrders[0]}
            />
            <ConfirmDeliveryModal
                isOpen={workflowActionState.isOpen && workflowActionState.action === 'mark_delivered'}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order || selectedOrders[0]}
            />

            <CreateDispatchModal
                isOpen={showDispatchModal}
                onClose={() => setShowDispatchModal(false)}
                onSuccess={() => {
                    setShowDispatchModal(false);
                    if (onClearSelection) onClearSelection();
                    onUpdate();
                }}
                selectedOrders={selectedOrders}
            />

            {isCompletePrintingModalOpen && selectedOrderForPrinting && (
                <CompletePrintingModal 
                    isOpen={isCompletePrintingModalOpen}
                    order={selectedOrderForPrinting}
                    onClose={() => {
                        setIsCompletePrintingModalOpen(false);
                        setSelectedOrderForPrinting(null);
                    }}
                    onSuccess={() => {
                        setIsCompletePrintingModalOpen(false);
                        setSelectedOrderForPrinting(null);
                        if (onClearSelection) onClearSelection();
                        onUpdate();
                    }}
                />
            )}

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.thCheckbox}>
                            {readyOrders.length > 0 && (
                                <input 
                                    type="checkbox" 
                                    className={styles.rowCheckbox}
                                    checked={allReadySelected}
                                    onChange={toggleSelectAll}
                                    title="Select all"
                                />
                            )}
                        </th>
                        <th 
                            onClick={onSortToggle} 
                            style={{ cursor: onSortToggle ? 'pointer' : 'default', userSelect: 'none' }}
                            title={onSortToggle ? "Click to toggle sort order" : undefined}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Date {sortOrder ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                            </div>
                        </th>
                        <th>Customer</th>
                        <th>Design</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedOrders.map((order) => (
                        <OrderTableRow
                            onWorkflowAction={(action, ord) =>
                                setWorkflowActionState({ isOpen: true, action, order: ord })
                            }
                            key={order.id}
                            order={order}
                            onUpdate={onUpdate}
                            onGenerateInvoice={onGenerateInvoice}
                            onEdit={onEdit}
                            highlightClass={highlightClass}
                            handleCustomerClick={handleCustomerClick}
                            isSelected={selectedIds?.has(order.id)}
                            onToggleSelect={onToggleSelect}
                            setIsCompletePrintingModalOpen={setIsCompletePrintingModalOpen}
                            setSelectedOrderForPrinting={setSelectedOrderForPrinting}
                            selectedOrderId={selectedOrderId}
                            onSelectOrder={onSelectOrder}
                        />
                    ))}
                </tbody>
            </table>

            <div className={styles.mobileCardsList}>
                {paginatedOrders.map((order) => (
                    <MobileOrderCard
                        key={order.id}
                        order={order}
                        onUpdate={onUpdate}
                        onGenerateInvoice={onGenerateInvoice}
                        onEdit={onEdit}
                        onWorkflowAction={(action, ord) =>
                            setWorkflowActionState({ isOpen: true, action, order: ord })
                        }
                        isSelected={selectedIds?.has(order.id)}
                        onToggleSelect={onToggleSelect}
                        setIsCompletePrintingModalOpen={setIsCompletePrintingModalOpen}
                        setSelectedOrderForPrinting={setSelectedOrderForPrinting}
                        selectedOrderId={selectedOrderId}
                        onSelectOrder={onSelectOrder}
                        isSelectionModeActive={selectedIds && selectedIds.size > 0}
                    />
                ))}
            </div>

            {needsPagination && (
                <div className={styles.pagination}>
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={styles.paginationBtn}
                    >
                        Previous
                    </button>
                    <span className={styles.paginationInfo}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={styles.paginationBtn}
                    >
                        Next
                    </button>
                </div>
            )}
            {selectedOrders.length > 0 && (() => {
                const totalMetres = selectedOrders.reduce((sum, o) => sum + (parseFloat(o.quantity_meters) || 0), 0);
                const uniqueStages = Array.from(new Set(selectedOrders.map(o =>
                    `${o.order_stage || 'order_added'}-${o.embroidery_status || ''}-${o.printing_status || ''}-${o.dyeing_status || ''}`
                )));
                const isMixed = uniqueStages.length > 1;
                const sample = selectedOrders[0];
                const sStage = sample.order_stage || 'order_added';
                const sEmb = sample.embroidery_status;
                const sDye = sample.dyeing_status;

                let bulkActionProps: { label: string; icon: string; color: string; onClick: () => void } | null = null;
                if (!isMixed) {
                    if (sStage === 'embroidery' && sEmb === 'queued_delivery')
                        bulkActionProps = { label: 'Deliver Orders', icon: 'ti-truck', color: '#3B82F6', onClick: () => setShowDispatchModal(true) };
                    else if (sStage === 'dyeing' && sDye === 'queued_delivery')
                        bulkActionProps = { label: 'Deliver Orders', icon: 'ti-truck', color: '#3B82F6', onClick: () => setShowDispatchModal(true) };
                    else if (sStage === 'ready')
                        bulkActionProps = { label: 'Deliver Orders', icon: 'ti-truck', color: '#3B82F6', onClick: () => setShowDispatchModal(true) };
                }

                return (
                    <>
                        {/* ── DESKTOP BULK BAR (>= 768px) ── */}
                        <div className={styles.desktopBulkBar}>
                            {/* Left: Selection Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingRight: '20px', borderRight: '1px solid var(--border-primary)', minWidth: '90px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                    {selectedOrders.length} {selectedOrders.length === 1 ? 'order' : 'orders'}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                                    {totalMetres.toFixed(1)}m selected
                                </span>
                            </div>

                            {/* Center: Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', flex: 1, justifyContent: 'center' }}>
                                {isMixed ? (
                                    <span style={{ color: '#EF4444', fontSize: '13px', fontWeight: 600 }}>Mixed stages selected - Bulk actions disabled</span>
                                ) : bulkActionProps ? (
                                    <button
                                        onClick={bulkActionProps.onClick}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 18px', borderRadius: '10px', fontSize: '13px',
                                            fontWeight: 600, cursor: 'pointer', border: 'none',
                                            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                                            color: '#FFFFFF',
                                            boxShadow: '0 2px 8px rgba(15,23,42,0.3)',
                                            transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <i className={`ti ${bulkActionProps.icon}`}></i> {bulkActionProps.label}
                                    </button>
                                ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 600 }}>No bulk actions for this stage</span>
                                )}
                            </div>

                            {/* Right: Clear */}
                            <div style={{ paddingLeft: '16px', borderLeft: '1px solid var(--border-primary)' }}>
                                <button
                                    onClick={() => { if (onToggleSelect && selectedIds) { selectedOrders.forEach(o => onToggleSelect(o.id)); } }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '13px',
                                        fontWeight: 500, cursor: 'pointer', border: '1px solid transparent',
                                        background: 'transparent', color: 'var(--text-tertiary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <X size={14} /> Clear
                                </button>
                            </div>
                        </div>

                        {/* ── MOBILE BULK TRAY (< 768px) ── */}
                        <AnimatePresence>
                        {!isOverlayActive && (
                            <motion.div 
                                className={styles.mobileBulkBar}
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            >
                                <div className={styles.mobileBulkLeft}>
                                    <span className={styles.mobileBulkBadge}>{selectedOrders.length}</span>
                                    <div className={styles.mobileBulkSummary}>
                                        <strong>{selectedOrders.length} {selectedOrders.length === 1 ? 'order' : 'orders'} selected</strong>
                                        <span>{totalMetres.toFixed(0)}m total</span>
                                    </div>
                                </div>
                                <div className={styles.mobileBulkRight}>
                                    {isMixed ? (
                                        <span className={styles.mobileBulkMsgMixed}>Mixed stages</span>
                                    ) : bulkActionProps ? (
                                        <button className={styles.mobileBulkActionBtn} onClick={bulkActionProps.onClick}>
                                            {bulkActionProps.label.includes('Embroidery') && <Scissors size={14} />}
                                            {bulkActionProps.label.includes('Dyeing') && <Droplets size={14} />}
                                            {bulkActionProps.label.includes('Deliver') && <Truck size={14} />}
                                            <span>
                                                {bulkActionProps.label.includes('Embroidery') ? 'Embroidery' :
                                                 bulkActionProps.label.includes('Dyeing') ? 'Dyeing' : 'Deliver'}
                                            </span>
                                        </button>
                                    ) : (
                                        <span className={styles.mobileBulkMsgNone}>No actions</span>
                                    )}
                                    <button
                                        className={styles.mobileBulkCloseBtn}
                                        onClick={() => { if (onToggleSelect && selectedIds) { selectedOrders.forEach(o => onToggleSelect(o.id)); } }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </>
                );
            })()}

        </div>
    );
}


function OrderActionMenu({ order, onUpdate, onGenerateInvoice, onEdit }: { order: any, onUpdate: () => void, onGenerateInvoice: (order: any) => void, onEdit?: (order: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const status = order.status?.toLowerCase() || 'pending';
    const isFinished = status === 'completed' || status === 'invoiced' || (status === ORDER_STATUSES.DELIVERED && order.invoice_generated);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
            if (res.ok) {
                onUpdate();
                setShowDeleteModal(false);
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to delete order');
            }
        } catch (error) {
            console.log('Failed to delete order');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleShareOrderWhatsApp = async (orderId: number, type: 'summary' | 'dispatch' | 'tracking') => {
        try {
            const res = await fetch(`/api/orders/${orderId}/share-details`);
            if (!res.ok) {
                alert('Failed to retrieve order details for sharing');
                return;
            }
            const data = await res.json();
            let message = '';
            if (type === 'summary') message = data.summaryMessage;
            else if (type === 'dispatch') message = data.dispatchMessage;
            else if (type === 'tracking') message = data.trackingMessage;

            window.open(`https://wa.me/${data.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        } catch (err) {
            console.error('Error sharing order via WhatsApp:', err);
        }
    };

    const menuItems = [
        { type: 'section', label: 'Order Management' },
        { label: 'View Details', icon: <Eye size={16} />, onClick: () => router.push(`/orders/${order.id}`) },
        { label: 'Edit Order', icon: <Edit2 size={16} />, onClick: () => onEdit?.(order) },
        { label: 'Duplicate Order', icon: <Copy size={16} />, onClick: () => {} },
        
        { type: 'separator' },
        { type: 'section', label: 'Documents & Printing' },
        { label: 'Print QR Label', icon: <QrCode size={16} />, onClick: () => setShowPrintModal(true) },
        { 
            label: 'Generate Invoice', 
            icon: <FileText size={16} />, 
            onClick: () => onGenerateInvoice(order),
            color: '#34C759',
            show: !order.invoice_generated
        },

        { type: 'separator' },
        { type: 'section', label: 'WhatsApp Share' },
        { label: 'Share Order Summary', icon: <MessageCircle size={16} />, onClick: () => handleShareOrderWhatsApp(order.id, 'summary'), color: '#25D366' },
        { label: 'Share Dispatch Slip', icon: <MessageCircle size={16} />, onClick: () => handleShareOrderWhatsApp(order.id, 'dispatch'), color: '#25D366' },
        { label: 'Share Tracking Update', icon: <MessageCircle size={16} />, onClick: () => handleShareOrderWhatsApp(order.id, 'tracking'), color: '#25D366' },

        { type: 'separator' },
        { type: 'section', label: 'Danger Zone' },
        { 
            label: 'Delete Order', 
            icon: <Trash2 size={16} />, 
            onClick: () => setShowDeleteModal(true), 
            color: '#FF3B30' 
        },
    ];

    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, upward: false });

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen) {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const upward = spaceBelow < 300 && spaceAbove > spaceBelow;
            
            setMenuPosition({ 
                top: upward ? rect.top : rect.bottom, 
                left: rect.right, 
                upward 
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className={styles.menuContainer} ref={menuRef}>
            <button 
                className={styles.moreBtn} 
                onClick={toggleMenu}
            >
                <MoreHorizontal size={18} />
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            key="action-menu"
                            className={styles.dropdown}
                            initial={{ opacity: 0, scale: 0.95, y: menuPosition.upward ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: menuPosition.upward ? 10 : -10 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{ 
                                position: 'fixed',
                                top: menuPosition.upward ? 'auto' : `${menuPosition.top + 8}px`,
                                bottom: menuPosition.upward ? `${window.innerHeight - menuPosition.top + 8}px` : 'auto',
                                left: `${menuPosition.left - 220}px`,
                                zIndex: 9999,
                                transformOrigin: menuPosition.upward ? 'bottom right' : 'top right',
                                padding: '8px 0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                border: '1px solid rgba(0,0,0,0.05)',
                                borderRadius: '12px'
                            }}
                        >
                            {menuItems.filter(item => item.show !== false).map((item, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} className={styles.separator} style={{ margin: '4px 0', borderTop: '1px solid #F3F4F6' }} />
                                ) : item.type === 'section' ? (
                                    <div key={idx} style={{ padding: '6px 16px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {item.label}
                                    </div>
                                ) : (
                                    <button 
                                        key={idx} 
                                        className={styles.menuItem} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            item.onClick?.();
                                            setIsOpen(false);
                                        }}
                                        style={{ color: item.color, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', textAlign: 'left', fontWeight: 500 }}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                )
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {showDeleteModal && createPortal(
                <div className="global-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.mobileSheetHandle} />
                        <div className={styles.modalIcon}>
                            <AlertTriangle size={24} color="#FF3B30" />
                        </div>
                        <h3 className={styles.modalTitle}>Delete this order permanently?</h3>
                        <p className={styles.modalText}>
                            Order <strong>#{order.order_number || order.id}</strong> for <strong>{order.customer_name}</strong> will be deleted. This action cannot be undone.
                        </p>
                        <div className={styles.modalInfo}>
                            <div className={styles.infoRow}>
                                <span>Amount:</span>
                                <strong>₹{order.total_price.toLocaleString('en-IN')}</strong>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className={styles.deleteBtn} onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? 'Deleting...' : 'Delete Order'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showPrintModal && (
                <PrintQRModal 
                    isOpen={showPrintModal} 
                    onClose={() => setShowPrintModal(false)} 
                    order={order} 
                />
            )}
        </div>
    );
}

function OrderActionButton({ 
    order, 
    onUpdate, 
    onWorkflowAction,
    setIsCompletePrintingModalOpen,
    setSelectedOrderForPrinting
}: { 
    order: any; 
    onUpdate: () => void; 
    onWorkflowAction: (action: string, order: any) => void;
    setIsCompletePrintingModalOpen: (val: boolean) => void;
    setSelectedOrderForPrinting: (order: any) => void;
}) {
    const stage = order.order_stage || 'order_added';
    const embStatus = order.embroidery_status;
    const printStatus = order.printing_status;
    const dyeStatus = order.dyeing_status;
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleApi = (actionKey: string) => {
        setIsProcessing(true);
        fetch(`/api/orders/${order.id}/workflow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: actionKey })
        })
        .then(res => res.json().then(data => ({ok: res.ok, data})))
        .then(({ok, data}) => {
            if (ok) {
                if (onUpdate) onUpdate();
            } else {
                console.log(`❌ Failed: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(err => console.log(`❌ Error: ${err.message}`))
        .finally(() => setIsProcessing(false));
    };

    const renderButton = (label: string, icon: string, color: string, bg: string, border: string, onClick: () => void, hoverBg?: string, hoverBorder?: string) => (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            disabled={isProcessing}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                border: `1px solid ${isHovered ? (hoverBorder || border.replace('0.15', '0.3').replace('0.2', '0.4')) : border}`,
                color: color,
                background: isHovered ? (hoverBg || bg.replace('0.05', '0.1').replace('0.08', '0.15')) : bg,
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                width: '100%',
                justifyContent: 'center',
                opacity: isProcessing ? 0.7 : 1,
                boxShadow: isHovered ? `0 4px 12px ${hoverBg || bg.replace('0.05', '0.2').replace('0.08', '0.2')}` : '0 2px 4px rgba(0,0,0,0.02)',
                transform: isHovered && !isProcessing ? 'translateY(-1px)' : 'none'
            }}
        >
            {isProcessing ? <i className="ti ti-loader ti-spin"></i> : <i className={icon}></i>}
            {isProcessing ? 'Processing...' : label}
        </button>
    );

    const renderBadge = (label: string, icon: string, color: string, bg: string, border: string) => (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: bg, color: color, border: `1px solid ${border}`,
            borderRadius: '12px', padding: '6px 14px', fontSize: '13px', fontWeight: 600,
            width: '100%', justifyContent: 'center'
        }}>
            <i className={icon}></i> {label}
        </div>
    );

    if (stage === 'order_added') return renderButton('Approve Order', 'ti ti-circle-check', '#92400E', '#FFFBEB', 'rgba(180, 83, 9, 0.15)', () => onWorkflowAction('approve', order), '#FEF3C7', 'rgba(180, 83, 9, 0.25)');
    if (stage === 'approved') return renderButton('Send To Embroidery', 'ti ti-needle', '#8B5CF6', 'rgba(139,92,246,0.08)', 'rgba(139,92,246,0.2)', () => onWorkflowAction('send_to_embroidery', order));
    if (stage === 'embroidery' && embStatus === 'queued_delivery') return renderBadge('Queued for Embroidery', 'ti ti-truck-loading', '#8B5CF6', 'rgba(139,92,246,0.05)', 'rgba(139,92,246,0.15)');
    if (stage === 'embroidery' && embStatus === 'in_progress') return renderButton('Complete (Mark Printing)', 'ti ti-printer', '#C2410C', '#FFF1E6', '#FDBA74', () => {
        setSelectedOrderForPrinting(order);
        setIsCompletePrintingModalOpen(true);
    }, '#FFE4CC', '#FB923C');
    if (stage === 'printing' && printStatus === 'in_progress') return renderButton('Send To Dyeing', 'ti ti-droplet', '#0EA5E9', 'rgba(14,165,233,0.08)', 'rgba(14,165,233,0.2)', () => onWorkflowAction('send_to_dyeing', order));
    if (stage === 'dyeing' && dyeStatus === 'queued_delivery') return renderBadge('Queued for Dyeing', 'ti ti-truck-loading', '#0EA5E9', 'rgba(14,165,233,0.05)', 'rgba(14,165,233,0.15)');
    if (stage === 'dyeing' && dyeStatus === 'in_progress') return renderButton('Complete (Ready)', 'ti ti-check', '#047857', '#ECFDF5', '#A7F3D0', () => handleApi('mark_ready'), '#D1FAE5', '#6EE7B7');
    if (stage === 'ready') return renderBadge('Ready For Delivery', 'ti ti-truck', '#10B981', 'rgba(16,185,129,0.05)', 'rgba(16,185,129,0.15)');
    if (stage === 'out_for_delivery') return renderButton('Mark Delivered', 'ti ti-circle-check', '#10B981', 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0.2)', () => handleApi('mark_delivered'));
    if (stage === 'delivered') return renderBadge('Delivered', 'ti ti-check', '#6B7280', 'rgba(107,114,128,0.08)', 'rgba(107,114,128,0.2)');
    
    return null;
}
