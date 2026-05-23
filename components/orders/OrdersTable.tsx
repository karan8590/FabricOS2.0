import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    MoreHorizontal, Eye, Edit2, Copy, FileText, 
    CheckCircle2, Trash2, AlertTriangle, Truck, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './OrdersTable.module.css';
import { createPortal } from 'react-dom';
import IntelligentChip from './IntelligentChip';
import CreateDispatchModal from './CreateDispatchModal';
import SendToVendorModal from './SendToVendorModal';
import ConfirmReceivedModal from './ConfirmReceivedModal';
import DispatchOrderModal from './DispatchOrderModal';
import ConfirmDeliveryModal from './ConfirmDeliveryModal';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

interface OrdersTableProps {
    orders: any[];
    onUpdate: () => void;
    onGenerateInvoice: (order: any) => void;
    onEdit?: (order: any) => void;
    activeWidget: string | null;
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
    onToggleSelect
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
}) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const status = order.status?.toLowerCase() || ORDER_STATUSES.CREATED;
    const now = Math.floor(Date.now() / 1000);
    const isFinished = status === ORDER_STATUSES.DELIVERED || status === 'invoiced' || status === 'completed';
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

    const isReady = status === ORDER_STATUSES.READY;

    return (
        <tr 
            className={`${styles.tr} ${rowStatusClass} ${highlightClass} ${isSelected ? styles.rowSelected : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <td className={styles.tdCheckbox}>
                {isReady && (
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
                <div className={styles.customerCell} onClick={() => handleCustomerClick(order.customer_id)} style={{ cursor: 'pointer' }}>
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
                <div className={styles.actionsWrapper}>
                    <OrderActionButton 
                        order={order} 
                        onUpdate={onUpdate} 
                        onWorkflowAction={(action) => onWorkflowAction(action, order)}
                    />
                    <OrderActionMenu 
                        order={order} 
                        onUpdate={onUpdate} 
                        onGenerateInvoice={onGenerateInvoice} 
                        onEdit={onEdit}
                    />
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
    handleCustomerClick 
}: { 
    order: any; 
    onUpdate: () => void; 
    onGenerateInvoice: (order: any) => void; 
    onEdit?: (order: any) => void;
    onWorkflowAction: (action: string, order: any) => void; 
    highlightClass: string; 
    handleCustomerClick: (id: number) => void; 
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const status = order.status?.toLowerCase() || ORDER_STATUSES.CREATED;
    const now = Math.floor(Date.now() / 1000);
    const isFinished = status === ORDER_STATUSES.DELIVERED || status === 'invoiced' || status === 'completed';
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
                <div className={styles.mobileActionsContainer}>
                    <OrderActionButton 
                        order={order} 
                        onUpdate={onUpdate} 
                        onWorkflowAction={(action) => onWorkflowAction(action, order)}
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
    );
});
OrderMobileCard.displayName = 'OrderMobileCard';

export default function OrdersTable({ orders, onUpdate, onGenerateInvoice, onEdit, activeWidget }: OrdersTableProps) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modals state
    const [workflowActionState, setWorkflowActionState] = useState<{isOpen: boolean, action: string, order: any}>({isOpen: false, action: '', order: null});
    
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const rowsPerPage = 20;

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [orders]);

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

    const readyOrders = orders.filter(o => o.status?.toLowerCase() === ORDER_STATUSES.READY);
    const allReadySelected = readyOrders.length > 0 && readyOrders.every(o => selectedIds.has(o.id));

    const toggleSelect = React.useCallback((id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = () => {
        if (allReadySelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(readyOrders.map(o => o.id)));
        }
    };

    const selectedOrders = orders.filter(o => selectedIds.has(o.id));

    const needsPagination = orders.length > 50;
    const startIndex = needsPagination ? (currentPage - 1) * rowsPerPage : 0;
    const endIndex = needsPagination ? startIndex + rowsPerPage : orders.length;
    const paginatedOrders = orders.slice(startIndex, endIndex);
    const totalPages = Math.ceil(orders.length / rowsPerPage);

    const closeWorkflowModal = () => setWorkflowActionState({isOpen: false, action: '', order: null});

    const handleModalSuccess = () => {
        closeWorkflowModal();
        onUpdate();
    };

    return (
        <div className={styles.tableContainer}>
            {/* Vendor Modals */}
            <SendToVendorModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'send_to_embroidery' || workflowActionState.action === 'send_to_dyeing')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order}
                action={workflowActionState.action as any}
            />
            <ConfirmReceivedModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'mark_printing' || workflowActionState.action === 'mark_ready')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order}
                action={workflowActionState.action as any}
            />
            <DispatchOrderModal
                isOpen={workflowActionState.isOpen && workflowActionState.action === 'dispatch'}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order}
            />
            <ConfirmDeliveryModal
                isOpen={workflowActionState.isOpen && workflowActionState.action === 'mark_delivered'}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order}
            />

            <CreateDispatchModal
                isOpen={showDispatchModal}
                onClose={() => setShowDispatchModal(false)}
                onSuccess={() => {
                    setShowDispatchModal(false);
                    setSelectedIds(new Set());
                    onUpdate();
                }}
                selectedOrders={selectedOrders}
            />

            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        className={styles.dispatchToolbar}
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={styles.dispatchToolbarLeft}>
                            <div className={styles.dispatchCount}>
                                <span>{selectedIds.size}</span>
                                order{selectedIds.size > 1 ? 's' : ''} selected
                            </div>
                            <div className={styles.dispatchMeta}>
                                {selectedOrders.reduce((s, o) => s + (o.quantity_meters || 0), 0)}m &nbsp;·&nbsp;
                                ₹{selectedOrders.reduce((s, o) => s + (o.total_price || 0), 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className={styles.dispatchToolbarRight}>
                            <button className={styles.dispatchClearBtn} onClick={() => setSelectedIds(new Set())}>
                                <X size={14} /> Clear
                            </button>
                            <button className={styles.dispatchCreateBtn} onClick={() => setShowDispatchModal(true)}>
                                <Truck size={15} /> Add to Dispatch
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                    title="Select all ready orders"
                                />
                            )}
                        </th>
                        <th>Order ID</th>
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
                            onWorkflowAction={(action, ord) => setWorkflowActionState({ isOpen: true, action, order: ord })}
                            key={order.id}
                            order={order}
                            onUpdate={onUpdate}
                            onGenerateInvoice={onGenerateInvoice}
                            onEdit={onEdit}
                            highlightClass={highlightClass}
                            handleCustomerClick={handleCustomerClick}
                            isSelected={selectedIds.has(order.id)}
                            onToggleSelect={toggleSelect}
                        />
                    ))}
                </tbody>
            </table>

            <div className={styles.mobileCardsList}>
                {paginatedOrders.map((order) => (
                        <OrderMobileCard 
                            onWorkflowAction={(action, ord) => setWorkflowActionState({ isOpen: true, action, order: ord })}
                            key={order.id}
                            order={order}
                            onUpdate={onUpdate}
                            onGenerateInvoice={onGenerateInvoice}
                            onEdit={onEdit}
                            highlightClass={highlightClass}
                            handleCustomerClick={handleCustomerClick}
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
        </div>
    );
}


function OrderActionMenu({ order, onUpdate, onGenerateInvoice, onEdit }: { order: any, onUpdate: () => void, onGenerateInvoice: (order: any) => void, onEdit?: (order: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const status = order.status?.toLowerCase() || 'pending';
    const isFinished = status === 'completed' || status === 'invoiced' || status === ORDER_STATUSES.DELIVERED;

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
                alert(data.error || 'Failed to delete order');
            }
        } catch (error) {
            alert('Failed to delete order');
        } finally {
            setIsDeleting(false);
        }
    };

    const menuItems = [
        { label: 'View Details', icon: <Eye size={16} />, onClick: () => router.push(`/orders/${order.id}`) },
        { label: 'Edit Order', icon: <Edit2 size={16} />, onClick: () => onEdit?.(order) },
        { label: 'Duplicate Order', icon: <Copy size={16} />, onClick: () => {} },
        
        { type: 'separator' },
        { 
            label: 'Generate Invoice', 
            icon: <FileText size={16} />, 
            onClick: () => onGenerateInvoice(order),
            color: '#34C759',
            show: !isFinished
        },

        { type: 'separator' },
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
                                transformOrigin: menuPosition.upward ? 'bottom right' : 'top right'
                            }}
                        >
                            {menuItems.filter(item => item.show !== false).map((item, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} className={styles.separator} />
                                ) : (
                                    <button 
                                        key={idx} 
                                        className={styles.menuItem} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                             
                                            item.onClick?.();
                                            setIsOpen(false);
                                        }}
                                        style={{ color: item.color }}
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
        </div>
    );
}

const ACTION_CONFIG: Record<string, { label: string, icon: string, color: string, bg: string, border: string }> = {
  draft:      { label: 'Review & Approve',  icon: 'ti ti-eye',          color: '#2563EB', bg: '#EFF6FF', border: '#2563EB' },
  created:    { label: 'Approve',           icon: 'ti ti-circle-check', color: '#2563EB', bg: '#EFF6FF', border: '#2563EB' },
  approved:   { label: 'Send to Embroidery',icon: 'ti ti-needle',       color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED' },
  embroidery: { label: 'Mark Printing',     icon: 'ti ti-printer',      color: '#D97706', bg: '#FFFBEB', border: '#D97706' },
  printing:   { label: 'Send to Dyeing',    icon: 'ti ti-droplet',      color: '#0D9488', bg: '#F0FDFA', border: '#0D9488' },
  dyeing:     { label: 'Mark Ready',        icon: 'ti ti-package',      color: '#16A34A', bg: '#F0FDF4', border: '#16A34A' },
  ready:      { label: 'Dispatch',          icon: 'ti ti-truck',        color: '#EA580C', bg: '#FFF7ED', border: '#EA580C' },
  dispatched: { label: 'Mark Delivered',    icon: 'ti ti-circle-check', color: '#15803D', bg: '#DCFCE7', border: '#15803D' },
};

function OrderActionButton({ 
    order, 
    onUpdate, 
    onWorkflowAction,
}: { 
    order: any; 
    onUpdate: () => void; 
    onWorkflowAction: (action: string) => void;
}) {
    const status = order.status?.toLowerCase() || ORDER_STATUSES.CREATED;
    const [isProcessing, setIsProcessing] = useState(false);

    if (status === ORDER_STATUSES.DELIVERED || status === 'completed' || status === 'invoiced') {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#F0FDF4',
                color: '#15803D',
                border: '1px solid #BBF7D0',
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 500,
            }}>
                <i className="ti ti-check" style={{ fontSize: '12px' }}></i> Completed
            </div>
        );
    }

    const config = ACTION_CONFIG[status];
    if (!config) return null;

    const handleAction = async () => {
        if (status === ORDER_STATUSES.CREATED || status === 'pending' || status === 'waiting_approval') {
            setIsProcessing(true);
            try {
                const res = await fetch(`/api/orders/${order.id}/workflow`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'approve' })
                });
                if (res.ok) onUpdate();
            } catch (error) {
                console.error(error);
            } finally {
                setIsProcessing(false);
            }
        } else {
            // Determine action keyword for modal
            let actionKey = '';
            if (status === ORDER_STATUSES.APPROVED) actionKey = 'send_to_embroidery';
            else if (status === ORDER_STATUSES.EMBROIDERY || status === 'embroidery_in_progress') actionKey = 'mark_printing';
            else if (status === ORDER_STATUSES.PRINTING || status === 'printing_in_factory') actionKey = 'send_to_dyeing';
            else if (status === ORDER_STATUSES.DYEING || status === 'dyeing_in_progress') actionKey = 'mark_ready';
            else if (status === ORDER_STATUSES.READY) actionKey = 'dispatch';
            else if (status === ORDER_STATUSES.DISPATCHED) actionKey = 'mark_delivered';
            
            if (actionKey) onWorkflowAction(actionKey);
        }
    };

    return (
        <button 
            onClick={handleAction}
            disabled={isProcessing}
            style={{
                border: `1.5px solid ${config.border}`,
                color: config.color,
                background: config.bg,
                borderRadius: '999px',
                padding: '5px 14px',
                fontSize: '13px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease',
                height: '30px',
                opacity: isProcessing ? 0.7 : 1
            }}
            onMouseOver={(e) => {
                if (!isProcessing) {
                    e.currentTarget.style.filter = 'brightness(0.95)';
                }
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.filter = 'none';
            }}
        >
            <i className={config.icon} style={{ fontSize: '14px' }}></i>
            {isProcessing ? 'Processing...' : config.label}
        </button>
    );
}
