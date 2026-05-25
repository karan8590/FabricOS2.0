const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/api/orders/[id]/workflow/route.ts';
let code = fs.readFileSync(file, 'utf8');

const searchEmbroidery = `            else if (action === 'send_to_embroidery' || action === 'send_to_dyeing') {
                const workType = action === 'send_to_embroidery' ? 'embroidery' : 'dyeing';`;

const replaceEmbroidery = `            else if (action === 'send_to_embroidery' || action === 'send_to_dyeing') {
                const stage = action === 'send_to_embroidery' ? 'queue_embroidery' : 'queue_dyeing';
                await db.prepare('UPDATE orders SET dispatch_stage = ? WHERE id = ? AND business_id = ?').run(stage, orderId, businessId);
                return NextResponse.json({ success: true, dispatch_stage: stage });
            }
            // OLD LOGIC BELOW IS COMMENTED OUT OR REMOVED
            /*
                const workType = action === 'send_to_embroidery' ? 'embroidery' : 'dyeing';`;

if (!code.includes('queue_embroidery')) {
    code = code.replace(searchEmbroidery, replaceEmbroidery);
    code = code.replace(/activityDescription = \`Sent \${metres}m to \${vendor\.name} at ₹\${rate}\/m = ₹\${totalCost}\.\`;\n            \} /g, 
    "activityDescription = `Sent ${metres}m to ${vendor.name} at ₹${rate}/m = ₹${totalCost}.`;\n            } */\n            else if (action === 'dispatch') {\n                await db.prepare('UPDATE orders SET dispatch_stage = ? WHERE id = ? AND business_id = ?').run('queue_customer_dispatch', orderId, businessId);\n                return NextResponse.json({ success: true });\n            }\n            /*");

    code = code.replace(/activityDescription = \`Dispatched \${metresDispatched}m via \${transporterName} \(LR: \${lrNumber}\)\. Expected delivery: \${expectedDelivery}\.\`;\n            \}/g,
    "activityDescription = `Dispatched ${metresDispatched}m via ${transporterName} (LR: ${lrNumber}). Expected delivery: ${expectedDelivery}.`;\n            } */");

    fs.writeFileSync(file, code);
}
