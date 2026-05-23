const fs = require('fs');
let code = fs.readFileSync('app/orders/[id]/page.tsx', 'utf8');

// 1. Add Workflow Modal import
code = code.replace(
  "import GenerateChallanModal from '@/components/challans/GenerateChallanModal';",
  "import GenerateChallanModal from '@/components/challans/GenerateChallanModal';\nimport ProductionWorkflowModal from '@/components/orders/ProductionWorkflowModal';"
);

// 2. Update STEPS array
const oldSteps = `const STEPS = [
    { key: 'pending', label: 'Order Placed' },
    { key: 'approved', label: 'Approved' },
    { key: 'in production', label: 'In Production' },
    { key: 'ready', label: 'Ready for Delivery' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' }
];`;
const newSteps = `const STEPS = [
    { key: 'pending', label: 'Placed' },
    { key: 'approved', label: 'Approved' },
    { key: 'embroidery_in_progress', label: 'Embroidery' },
    { key: 'printing_in_factory', label: 'Printing' },
    { key: 'dyeing_in_progress', label: 'Dyeing' },
    { key: 'ready', label: 'Ready' },
    { key: 'delivered', label: 'Delivered' }
];`;
code = code.replace(oldSteps, newSteps);

// 3. Add Workflow Modal State
code = code.replace(
  "const [challanModalState, setChallanModalState] = useState<{ isOpen: boolean; type: 'dispatch'|'jobwork'; linkedData?: any }>({ isOpen: false, type: 'dispatch' });",
  "const [challanModalState, setChallanModalState] = useState<{ isOpen: boolean; type: 'dispatch'|'jobwork'; linkedData?: any }>({ isOpen: false, type: 'dispatch' });\n    const [workflowModalState, setWorkflowModalState] = useState<{isOpen: boolean, action: 'send_to_embroidery' | 'send_to_dyeing'}>({isOpen: false, action: 'send_to_embroidery'});"
);

// 4. Update the quick confirm modal action handling (handleConfirmAction)
const handleStatusChangeStr = `const handleStatusChange = async (newStatus: string) => {`;
const newHandleStatusChangeStr = `const handleWorkflowTransition = async (action: string) => {
        try {
            const res = await fetch(\`/api/orders/\${params.id}/workflow\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                fetchOrder();
                setConfirmAction(null);
            } else alert('Failed to update workflow');
        } catch (err) {
            alert('Error updating workflow');
        }
    };
    
    const handleStatusChange = async (newStatus: string) => {`;
code = code.replace(handleStatusChangeStr, newHandleStatusChangeStr);

// Modify handleConfirmAction
const handleConfirmCodeOld = `
    const handleConfirmAction = () => {
        if (confirmAction) {
            handleStatusChange(confirmAction);
            setConfirmAction(null);
        }
    };
`;
const handleConfirmCodeNew = `
    const handleConfirmAction = () => {
        if (confirmAction) {
            if (confirmAction === 'approve' || confirmAction === 'completed') {
                handleStatusChange(confirmAction === 'approve' ? 'approved' : 'completed');
                setConfirmAction(null);
            } else {
                handleWorkflowTransition(confirmAction);
            }
        }
    };
`;
code = code.replace("const handleConfirmAction = () => {\n        if (confirmAction) {\n            handleStatusChange(confirmAction);\n            setConfirmAction(null);\n        }\n    };", handleConfirmCodeNew);


// 5. Update the action buttons in the header
const oldButtons = `                    {status === 'pending' && <button className={\`\${styles.btnPrimary} \${styles.btnApprove}\`} onClick={() => setConfirmAction('approved')}><CheckCircle2 size={16} /> Approve Order</button>}
                    {status === 'approved' && <button className={styles.btnPrimary} onClick={() => setConfirmAction('in production')}><Package size={16} /> Mark In Production</button>}
                    {(status === 'in production' || status === 'ready') && <button className={styles.btnPrimary} onClick={() => setConfirmAction('delivered')}><Truck size={16} /> Mark Delivered</button>}
                    {status === 'delivered' && <button className={styles.btnPrimary} onClick={() => setConfirmAction('completed')}><CheckCircle2 size={16} /> Mark Complete</button>}`;

const newButtons = `                    {status === 'pending' && <button className={\`\${styles.btnPrimary} \${styles.btnApprove}\`} onClick={() => setConfirmAction('approve')}><CheckCircle2 size={16} /> Approve</button>}
                    {status === 'approved' && <button className={styles.btnPrimary} onClick={() => setWorkflowModalState({ isOpen: true, action: 'send_to_embroidery' })}><Scissors size={16} /> Send to Embroidery</button>}
                    {status === 'embroidery_in_progress' && <button className={styles.btnPrimary} style={{background: '#8B5CF6'}} onClick={() => setConfirmAction('return_for_printing')}><ArrowRight size={16} /> Return for Printing</button>}
                    {status === 'printing_in_factory' && <button className={styles.btnPrimary} style={{background: '#0EA5E9'}} onClick={() => setWorkflowModalState({ isOpen: true, action: 'send_to_dyeing' })}><Droplets size={16} /> Send to Dyeing</button>}
                    {status === 'dyeing_in_progress' && <button className={styles.btnPrimary} style={{background: '#34C759'}} onClick={() => setConfirmAction('ready_for_delivery')}><Package size={16} /> Mark Ready</button>}
                    {status === 'ready' && <button className={styles.btnPrimary} style={{background: '#000'}} onClick={() => setConfirmAction('mark_delivered')}><Truck size={16} /> Mark Delivered</button>}`;

code = code.replace(oldButtons, newButtons);


// 6. Add ProductionWorkflowModal to the return block
code = code.replace(
  "                {challanModalState.isOpen && (",
  `                <ProductionWorkflowModal 
                    isOpen={workflowModalState.isOpen}
                    onClose={() => setWorkflowModalState(prev => ({ ...prev, isOpen: false }))}
                    onSuccess={() => {
                        setWorkflowModalState(prev => ({ ...prev, isOpen: false }));
                        fetchOrder();
                    }}
                    order={order}
                    action={workflowModalState.action}
                />
                
                {challanModalState.isOpen && (`
);

fs.writeFileSync('app/orders/[id]/page.tsx', code);
