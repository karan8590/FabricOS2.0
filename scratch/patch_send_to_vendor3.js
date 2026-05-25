const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/SendToVendorModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /}, \[isOpen, order, action\]\);/g,
    '}, [isOpen, orders, action]);'
);

fs.writeFileSync(file, content);
console.log("Patched SendToVendorModal line 64");
