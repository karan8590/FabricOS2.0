const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const handleAction = \(\) => {/g,
    `const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('SEND TO EMBROIDERY CLICKED', order.id, 'Status:', status);`
);

content = content.replace(
    /if \(actionKey\) onWorkflowAction\(actionKey\);/g,
    `if (actionKey) {
                    console.log('Calling onWorkflowAction with actionKey:', actionKey);
                    onWorkflowAction(actionKey);
                }`
);

content = content.replace(
    /onWorkflowAction={\(action, ord\) => setWorkflowActionState\(\{ isOpen: true, action, order: ord \}\)}/g,
    `onWorkflowAction={(action, ord) => {
                                console.log('MODAL STATE CHANGED to action:', action, 'for order:', ord?.id);
                                setWorkflowActionState({ isOpen: true, action, order: ord });
                            }}`
);

fs.writeFileSync(file, content);
console.log("Patched debug logs");
