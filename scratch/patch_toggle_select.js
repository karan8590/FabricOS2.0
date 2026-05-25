const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /onToggleSelect={toggleSelect}/g,
    'onToggleSelect={onToggleSelect}'
);

fs.writeFileSync(file, content);
console.log("Patched toggleSelect");
