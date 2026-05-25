const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /order={workflowActionState\.order}\s+action={workflowActionState\.action as any}/g,
    `orders={workflowActionState.order ? [workflowActionState.order] : []}
                action={workflowActionState.action as any}`
);

fs.writeFileSync(file, content);
console.log("Patched SendToVendorModal render in OrdersTable");
