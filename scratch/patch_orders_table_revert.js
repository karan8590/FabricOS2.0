const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `<ConfirmReceivedModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'mark_printing' || workflowActionState.action === 'mark_ready')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                orders={workflowActionState.order ? [workflowActionState.order] : []}
                action={workflowActionState.action as any}
            />`;

const newStr = `<ConfirmReceivedModal
                isOpen={workflowActionState.isOpen && (workflowActionState.action === 'mark_printing' || workflowActionState.action === 'mark_ready')}
                onClose={closeWorkflowModal}
                onSuccess={handleModalSuccess}
                order={workflowActionState.order}
                action={workflowActionState.action as any}
            />`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(file, content);
console.log("Reverted ConfirmReceivedModal props");
