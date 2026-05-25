const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/selectedIds\.has/g, '(selectedIds?.has)');
content = content.replace(/selectedIds\.size/g, '(selectedIds?.size || 0)');
content = content.replace(/\(selectedIds\?\.has\)\(o\.id\)/g, 'selectedIds?.has(o.id)');
content = content.replace(/\(selectedIds\?\.has\)\(order\.id\)/g, 'selectedIds?.has(order.id)');

fs.writeFileSync(file, content);
console.log("Patched Selected Ids");
