const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/api/orders/bulk-workflow/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Allow send_to_printing
content = content.replace(
    /action === 'send_to_embroidery' \|\| action === 'send_to_dyeing'/g,
    "action === 'send_to_embroidery' || action === 'send_to_dyeing' || action === 'send_to_printing'"
);

content = content.replace(
    /const type = action === 'send_to_embroidery' \? 'embroidery' : 'dyeing';/g,
    "const type = action === 'send_to_embroidery' ? 'embroidery' : (action === 'send_to_printing' ? 'printing' : 'dyeing');"
);

content = content.replace(
    /dyeing_status = CASE WHEN \? = 'dyeing' THEN 'sent' ELSE dyeing_status END/g,
    `dyeing_status = CASE WHEN ? = 'dyeing' THEN 'sent' ELSE dyeing_status END,
                            printing_status = CASE WHEN ? = 'printing' THEN 'sent' ELSE printing_status END`
);

content = content.replace(
    /type, type, type, orderId, businessId/g,
    `type, type, type, type, orderId, businessId`
);

fs.writeFileSync(file, content);
console.log("Patched Bulk Workflow API");
