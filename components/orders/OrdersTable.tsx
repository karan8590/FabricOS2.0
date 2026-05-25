import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    MoreHorizontal, Eye, Edit2, Copy, FileText, 
    CheckCircle2, Trash2, AlertTriangle, Truck, X, QrCode, Printer
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
import PrintQRModal from './PrintQRModal';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';

// Checkboxes ONLY for orders queued for customer dispatch
const isEligibleForDispatch = (order: any): boolean => {
    const s = (order.status || '').toLowerCase();
    return s === 'queued_for_dispatch';
};

interface OrdersTableProps {
    orders: any[];
    onUpdate: () => void;
    onGenerateInvoice: (order: any) => void;
    onEdit?: (order: any) => void;
    activeWidget: string | null;
    selectedIds?: Set<number>;
    onToggleSelect?: (id: number) => void;
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

    const isReady = status === ORDER_STATUSES.READY;

    return (
        <tr 
            className={`${styles.tr} ${rowStatusClass} ${highlightClass} ${isSelected ? styles.rowSelected : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <td className={styles.tdCheckbox}>
                {isEligibleForDispatch(order) && (
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



export default function OrdersTable({ orders, onUpdate, onGenerateInvoice, onEdit, activeWidget, selectedIds, onToggleSelect }: OrdersTableProps) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modals state
    const [workflowActionState, setWorkflowActionState] = useState<{isOpen: boolean, action: string, order: any}>({isOpen: false, action: '', order: null});
    
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const rowsPerPage = 20;

    useEffect(() => {
        // Reset page if needed via parent
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

    const readyOrders = orders.filter(o => isEligibleForDispatch(o));
    
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

    console.log('OrdersTable rendering modals, workflowActionState:', workflowActionState);
    return (
        <div className={styles.tableContainer}>
            {/* Vendor Modals */}
            <SendToVendorModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'send_to_embroidery' || workflowActionState.action === 'send_to_dyeing')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                orders={workflowActionState.order ? [workflowActionState.order] : []}
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
                    onUpdate();
                }}
                selectedOrders={selectedOrders}
            />

            

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
                            onWorkflowAction={(action, ord) => {
                                console.log('MODAL STATE CHANGED to action:', action, 'for order:', ord?.id);
                                setWorkflowActionState({ isOpen: true, action, order: ord });
                            }}
                            key={order.id}
                            order={order}
                            onUpdate={onUpdate}
                            onGenerateInvoice={onGenerateInvoice}
                            onEdit={onEdit}
                            highlightClass={highlightClass}
                            handleCustomerClick={handleCustomerClick}
                            isSelected={selectedIds?.has(order.id)}
                            onToggleSelect={onToggleSelect}
                        />
                    ))}
                </tbody>
            </table>

            <div className={styles.mobileCardsList}>
                {paginatedOrders.map((order) => (
                        <OrderMobileCard 
                            onWorkflowAction={(action, ord) => {
                                console.log('MODAL STATE CHANGED to action:', action, 'for order:', ord?.id);
                                setWorkflowActionState({ isOpen: true, action, order: ord });
                            }}
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
                alert(data.error || 'Failed to delete order');
            }
        } catch (error) {
            alert('Failed to delete order');
        } finally {
            setIsDeleting(false);
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

const ACTION_CONFIG: Record<string, { label: string, icon: string, color: string, bg: string, border: string, hoverBg: string, hoverBorder: string }> = {
  draft:      { label: '✓ Review & Approve',  icon: 'ti ti-eye',          color: '#D97706', bg: 'rgba(217, 119, 6, 0.05)', border: 'rgba(217, 119, 6, 0.15)', hoverBg: 'rgba(217, 119, 6, 0.1)', hoverBorder: 'rgba(217, 119, 6, 0.3)' },
  created:    { label: '✓ Approve Order',     icon: 'ti ti-circle-check', color: '#D97706', bg: 'rgba(217, 119, 6, 0.05)', border: 'rgba(217, 119, 6, 0.15)', hoverBg: 'rgba(217, 119, 6, 0.1)', hoverBorder: 'rgba(217, 119, 6, 0.3)' },
  approved:   { label: '↗ Send To Embroidery',icon: 'ti ti-needle',       color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.08)', border: 'rgba(175, 82, 222, 0.2)', hoverBg: 'rgba(175, 82, 222, 0.15)', hoverBorder: 'rgba(175, 82, 222, 0.4)' },
  embroidery: { label: '→ Mark Printing',     icon: 'ti ti-printer',      color: '#4F46E5', bg: 'rgba(79, 70, 229, 0.05)', border: 'rgba(79, 70, 229, 0.15)', hoverBg: 'rgba(79, 70, 229, 0.1)', hoverBorder: 'rgba(79, 70, 229, 0.3)' },
  printing:   { label: '↗ Send To Dyeing',    icon: 'ti ti-droplet',      color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.05)', border: 'rgba(14, 165, 233, 0.15)', hoverBg: 'rgba(14, 165, 233, 0.1)', hoverBorder: 'rgba(14, 165, 233, 0.3)' },
  dyeing:     { label: '✓ Mark Ready',        icon: 'ti ti-package',      color: '#EA580C', bg: 'rgba(234, 88, 12, 0.05)', border: 'rgba(234, 88, 12, 0.15)', hoverBg: 'rgba(234, 88, 12, 0.1)', hoverBorder: 'rgba(234, 88, 12, 0.3)' },
  ready:      { label: '↗ Dispatch',          icon: 'ti ti-truck',        color: '#EA580C', bg: 'rgba(234, 88, 12, 0.05)', border: 'rgba(234, 88, 12, 0.15)', hoverBg: 'rgba(234, 88, 12, 0.1)', hoverBorder: 'rgba(234, 88, 12, 0.3)' },
  dispatched: { label: '✓ Mark Delivered',    icon: 'ti ti-circle-check', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.05)', border: 'rgba(22, 163, 74, 0.15)', hoverBg: 'rgba(22, 163, 74, 0.1)', hoverBorder: 'rgba(22, 163, 74, 0.3)' },
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
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    if (status === ORDER_STATUSES.DELIVERED || status === 'completed' || status === 'invoiced') {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(22, 163, 74, 0.08)',
                color: '#16A34A',
                border: '1px solid rgba(22, 163, 74, 0.2)',
                borderRadius: '12px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
            }}>
                <i className="ti ti-check"></i> ✓ Completed
            </div>
        );
    }

    if (order.dispatch_status === 'queued') {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(175, 82, 222, 0.08)',
                color: '#AF52DE',
                border: '1px solid rgba(175, 82, 222, 0.2)',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                width: '100%',
                justifyContent: 'center',
                opacity: 0.8,
                cursor: 'default'
            }}>
                <i className="ti ti-clock"></i> Queued For Dispatch
            </div>
        );
    }

    const config = ACTION_CONFIG[status];
    if (!config) return null;

    const confirmApprove = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });

            if (res.ok) {
                setShowApproveModal(false);
                if (onUpdate) onUpdate();
            } else {
                const data = await res.json();
                alert(`❌ Failed to approve order: ${data.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            alert(`❌ Failed to approve order: ${error.message || error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('SEND TO EMBROIDERY CLICKED', order.id, 'Status:', status);
        if (status === ORDER_STATUSES.CREATED || status === 'pending' || status === 'waiting_approval') {
            setShowApproveModal(true);
        } else {
            let actionKey = '';
            if (status === ORDER_STATUSES.APPROVED) actionKey = 'send_to_embroidery';
            else if (status === ORDER_STATUSES.EMBROIDERY || status === 'embroidery_in_progress') actionKey = 'mark_printing';
            else if (status === ORDER_STATUSES.PRINTING || status === 'printing_in_factory') actionKey = 'send_to_dyeing';
            else if (status === ORDER_STATUSES.DYEING || status === 'dyeing_in_progress') actionKey = 'mark_ready';
            else if (status === ORDER_STATUSES.READY) actionKey = 'dispatch';
            else if (status === ORDER_STATUSES.DISPATCHED) actionKey = 'mark_delivered';
            
            if (actionKey === 'dispatch') {
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
                        alert(`❌ Failed to queue order: ${data.error || 'Unknown error'}`);
                    }
                })
                .catch(err => alert(`❌ Error: ${err.message}`))
                .finally(() => setIsProcessing(false));
            } else {
                if (actionKey) {
                    console.log('Calling onWorkflowAction with actionKey:', actionKey);
                    onWorkflowAction(actionKey);
                }
            }
        }
    };

    return (
        <>
        <button 
            onClick={handleAction}
            disabled={isProcessing}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                border: `1px solid ${isHovered ? config.hoverBorder : config.border}`,
                color: config.color,
                background: isHovered ? config.hoverBg : config.bg,
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
                boxShadow: isHovered ? `0 4px 12px ${config.bg.replace('0.05', '0.2').replace('0.08', '0.2')}` : '0 2px 4px rgba(0,0,0,0.02)',
                transform: isHovered && !isProcessing ? 'translateY(-1px)' : 'none'
            }}
        >
            {isProcessing ? <i className="ti ti-loader ti-spin"></i> : null}
            {isProcessing ? 'Processing...' : config.label}
        </button>

        {showApproveModal && createPortal(
            <div className="global-modal-overlay" onClick={() => setShowApproveModal(false)}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <div className={styles.modalIcon} style={{ background: 'rgba(217, 119, 6, 0.1)' }}>
                        <i className="ti ti-circle-check" style={{ fontSize: '28px', color: '#D97706' }}></i>
                    </div>
                    <h3 className={styles.modalTitle}>Approve Order?</h3>
                    <p className={styles.modalText}>
                        Are you sure you want to approve Order <strong>#{order.order_number || order.id}</strong> for production? This will move it to the next workflow stage.
                    </p>
                    <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={() => setShowApproveModal(false)} disabled={isProcessing}>
                            Cancel
                        </button>
                        <button 
                            className={styles.primaryActionBtn}
                            onClick={confirmApprove}
                            disabled={isProcessing}
                            style={{
                                flex: 1,
                                background: '#D97706',
                                color: '#ffffff',
                                border: 'none',
                                justifyContent: 'center',
                                padding: '12px',
                                fontSize: '14px',
                                borderRadius: '12px',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? <i className="ti ti-loader ti-spin"></i> : <i className="ti ti-circle-check"></i>}
                            {isProcessing ? 'Approving...' : 'Confirm Approval'}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        </>
    );
}
