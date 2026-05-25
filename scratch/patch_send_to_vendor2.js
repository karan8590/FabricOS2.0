const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/SendToVendorModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /`Order \${orders\.length} \(\${order\.customer_name}\)`/g,
    "`${orders.length} orders selected`"
);

fs.writeFileSync(file, content);
console.log("Patched SendToVendorModal line 218");
