const fs = require('fs');
let code = fs.readFileSync('components/orders/OrdersTable.tsx', 'utf8');

// 1. Add Modal import
code = code.replace(
  "import IntelligentChip from './IntelligentChip';",
  "import IntelligentChip from './IntelligentChip';\nimport ProductionWorkflowModal from './ProductionWorkflowModal';"
);

// 2. Add workflow Modal state to OrdersTable
code = code.replace(
  "const [currentPage, setCurrentPage] = useState(1);",
  "const [currentPage, setCurrentPage] = useState(1);\n    const [workflowModalState, setWorkflowModalState] = useState<{isOpen: boolean, order: any, action: 'send_to_embroidery' | 'send_to_dyeing'}>({isOpen: false, order: null, action: 'send_to_embroidery'});"
);

// 3. Add Modal component to OrdersTable return
code = code.replace(
  "        <div className={styles.tableContainer}>",
  `        <div className={styles.tableContainer}>
            <ProductionWorkflowModal 
                isOpen={workflowModalState.isOpen}
                onClose={() => setWorkflowModalState(prev => ({ ...prev, isOpen: false }))}
                onSuccess={() => {
                    setWorkflowModalState(prev => ({ ...prev, isOpen: false }));
                    onUpdate();
                }}
                order={workflowModalState.order}
                action={workflowModalState.action}
            />`
);

// 4. Pass onWorkflowAction to rows
code = code.replace(/<OrderTableRow /g, "<OrderTableRow \n                            onWorkflowAction={(action) => setWorkflowModalState({ isOpen: true, order, action })}");
code = code.replace(/<OrderMobileCard /g, "<OrderMobileCard \n                        onWorkflowAction={(action) => setWorkflowModalState({ isOpen: true, order, action })}");

// 5. Update props for OrderTableRow & OrderMobileCard to accept onWorkflowAction
code = code.replace(/onEdit\?: \(order: any\) => void;/g, "onEdit?: (order: any) => void;\n    onWorkflowAction?: (action: 'send_to_embroidery' | 'send_to_dyeing') => void;");
code = code.replace(/onEdit, \n    highlightClass/g, "onEdit, \n    onWorkflowAction,\n    highlightClass");

// 6. Pass onWorkflowAction to PrimaryAction inside OrderTableRow and OrderMobileCard
code = code.replace(/<PrimaryAction \n                        order={order} \n                        onUpdate={onUpdate} \n                        onGenerateInvoice={onGenerateInvoice} \n                    \/>/g, 
  `<PrimaryAction \n                        order={order} \n                        onUpdate={onUpdate} \n                        onGenerateInvoice={onGenerateInvoice} \n                        onWorkflowAction={onWorkflowAction}\n                    />`
);

// 7. Update PrimaryAction Component
const primaryActionStart = code.indexOf("function PrimaryAction({ order, onUpdate, onGenerateInvoice }");
const primaryActionEnd = code.length;
const newPrimaryAction = `
function PrimaryAction({ order, onUpdate, onGenerateInvoice, onWorkflowAction }: { order: any, onUpdate: () => void, onGenerateInvoice: (order: any) => void, onWorkflowAction?: (action: 'send_to_embroidery' | 'send_to_dyeing') => void }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [actionType, setActionType] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const status = order.status?.toLowerCase() || 'pending';
    
    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            if (actionType === 'approve') {
                const res = await fetch(\`/api/orders/\${order.id}/approve\`, { method: 'PATCH' });
                if (res.ok) onUpdate();
            } else if (actionType === 'complete') {
                onGenerateInvoice(order);
            } else if (actionType) {
                const res = await fetch(\`/api/orders/\${order.id}/workflow\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: actionType })
                });
                if (res.ok) onUpdate();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
            setShowConfirm(false);
        }
    };

    const renderConfirmModal = () => {
        if (!showConfirm) return null;
        
        let titleText = 'Confirm Action';
        let bodyText = 'Are you sure?';
        let btnBg = '#3B82F6';
        let btnText = 'Confirm';
        let iconColor = '#3B82F6';
        let iconBg = 'rgba(59, 130, 246, 0.12)';
        
        if (actionType === 'approve') {
            titleText = 'Approve Order?';
            bodyText = \`Are you sure you want to approve Order #\${order.order_number || order.id}? This will move it to production.\`;
            btnBg = '#FFCC00'; btnText = 'Approve'; iconColor = '#000000'; iconBg = 'rgba(255, 204, 0, 0.12)';
        } else if (actionType === 'return_for_printing') {
            titleText = 'Return for Printing?';
            bodyText = \`Mark Order #\${order.order_number || order.id} as returned from Embroidery and currently printing?\`;
            btnBg = '#8B5CF6'; btnText = 'Confirm Return'; iconColor = '#8B5CF6'; iconBg = 'rgba(139, 92, 246, 0.12)';
        } else if (actionType === 'ready_for_delivery') {
            titleText = 'Ready for Delivery?';
            bodyText = \`Mark Order #\${order.order_number || order.id} as fully processed and ready for delivery?\`;
            btnBg = '#34C759'; btnText = 'Mark Ready'; iconColor = '#34C759'; iconBg = 'rgba(52, 199, 89, 0.12)';
        } else if (actionType === 'mark_delivered') {
            titleText = 'Mark Delivered?';
            bodyText = \`Confirm delivery for Order #\${order.order_number || order.id}?\`;
            btnBg = '#000000'; btnText = 'Delivered'; iconColor = '#000000'; iconBg = '#E5E7EB';
        }
        
        return createPortal(
            <div className="global-modal-overlay" onClick={() => setShowConfirm(false)}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <div className={styles.modalIcon} style={{ background: iconBg, color: iconColor }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className={styles.modalTitle}>{titleText}</h3>
                    <p className={styles.modalText}>{bodyText}</p>
                    <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)} disabled={isProcessing}>
                            Cancel
                        </button>
                        <button 
                            className={styles.primaryActionBtn} 
                            style={{ 
                                padding: '0 24px', 
                                background: btnBg, 
                                color: iconColor === '#000000' ? '#000000' : '#FFFFFF', 
                                borderRadius: '8px',
                                border: 'none',
                                justifyContent: 'center'
                            }}
                            onClick={handleConfirm} 
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Processing...' : btnText}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    if (status === 'pending') {
        return (
            <>
                <button className={\`\${styles.primaryActionBtn} \${styles.approveBtn}\`} onClick={() => { setActionType('approve'); setShowConfirm(true); }}>
                    <CheckCircle2 size={14} />
                    <span>Approve</span>
                </button>
                {renderConfirmModal()}
            </>
        );
    }
    
    if (status === 'approved') {
        return (
            <button className={\`\${styles.primaryActionBtn} \${styles.completeBtn}\`} onClick={() => onWorkflowAction?.('send_to_embroidery')}>
                <span className="font-semibold px-1">✂️</span>
                <span>Send to Embroidery</span>
            </button>
        );
    }
    
    if (status === 'embroidery_in_progress') {
        return (
            <>
                <button className={\`\${styles.primaryActionBtn} \${styles.completeBtn}\`} style={{ background: '#8B5CF6' }} onClick={() => { setActionType('return_for_printing'); setShowConfirm(true); }}>
                    <span className="font-semibold px-1">🔄</span>
                    <span>Return for Printing</span>
                </button>
                {renderConfirmModal()}
            </>
        );
    }
    
    if (status === 'printing_in_factory') {
        return (
            <button className={\`\${styles.primaryActionBtn} \${styles.completeBtn}\`} style={{ background: '#0EA5E9' }} onClick={() => onWorkflowAction?.('send_to_dyeing')}>
                <span className="font-semibold px-1">💧</span>
                <span>Send to Dyeing</span>
            </button>
        );
    }
    
    if (status === 'dyeing_in_progress') {
        return (
            <>
                <button className={\`\${styles.primaryActionBtn} \${styles.completeBtn}\`} style={{ background: '#34C759', color: '#000' }} onClick={() => { setActionType('ready_for_delivery'); setShowConfirm(true); }}>
                    <Package size={14} />
                    <span>Mark Ready</span>
                </button>
                {renderConfirmModal()}
            </>
        );
    }
    
    if (status === 'ready') {
        return (
            <>
                <button className={\`\${styles.primaryActionBtn} \${styles.completeBtn}\`} style={{ background: '#000', color: '#fff' }} onClick={() => { setActionType('mark_delivered'); setShowConfirm(true); }}>
                    <Truck size={14} />
                    <span>Mark Delivered</span>
                </button>
                {renderConfirmModal()}
            </>
        );
    }

    if (status === 'invoiced' || status === 'completed' || status === 'delivered') {
        return (
            <div className={styles.deliveredBadge}>
                <Truck size={14} />
                <span>Delivered</span>
            </div>
        );
    }

    return null;
}
`;

code = code.substring(0, primaryActionStart) + newPrimaryAction;

// Add Package import at the top
code = code.replace("Truck, Bell", "Truck, Bell, Package, ArrowRight, Droplets, Scissors");

fs.writeFileSync('components/orders/OrdersTable.tsx', code);
