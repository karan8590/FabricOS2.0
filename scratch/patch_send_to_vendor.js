const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/SendToVendorModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /order\.order_number \|\| order\.id/g,
    'orders.length'
);

content = content.replace(
    /\(order\.customer_name\)/g,
    'orders'
);

fs.writeFileSync(file, content);
console.log("Patched SendToVendorModal");
