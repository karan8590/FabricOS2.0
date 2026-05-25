const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the AnimatePresence toolbar block with empty string
const toolbarRegex = /<AnimatePresence>[\s\S]*?<\/AnimatePresence>/;
content = content.replace(toolbarRegex, '');

// Update isEligibleForDispatch logic
const isEligibleOld = `const validStatuses = [
        ORDER_STATUSES.APPROVED,
        ORDER_STATUSES.EMBROIDERY,
        ORDER_STATUSES.PRINTING,
        ORDER_STATUSES.DYEING,
        ORDER_STATUSES.READY
    ];
    return validStatuses.includes(s);`;

const isEligibleNew = `return s === 'queued_for_dispatch' || order.dispatch_status === 'queued' || order.ready_for_customer_dispatch === true || s === 'ready';`;

content = content.replace(isEligibleOld, isEligibleNew);

fs.writeFileSync(file, content);
console.log("Patched OrdersTable (Removed old top toolbar, updated eligible logic)");
