const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/lib/pdf/generateVendorChallanServer.ts';
let code = fs.readFileSync(file, 'utf8');

// Update Interface
code = code.replace('order_number: string;', `order_number?: string;\n    orders?: { order_number: string; design_name: string; fabric_type: string; quantity: number; rate_per_meter: number; total_cost: number; }[];`);

// Update Table generation logic
const tableReplacement = `
    const tableBody = [];
    if (data.orders && data.orders.length > 0) {
        data.orders.forEach((o, index) => {
            tableBody.push([
                (index + 1).toString(),
                o.order_number || 'N/A',
                o.design_name || 'Standard',
                o.fabric_type || 'N/A',
                \`\${o.quantity}m\`,
                \`Rs \${o.rate_per_meter}\`,
                \`Rs \${o.total_cost}\`
            ]);
        });
    } else {
        tableBody.push([
            '1',
            data.order_number || 'N/A',
            data.design_name || 'Standard',
            data.fabric_type || 'N/A',
            \`\${data.quantity}m\`,
            \`Rs \${data.rate_per_meter}\`,
            \`Rs \${data.total_cost}\`
        ]);
    }
`;

code = code.replace(/const tableBody = \[[\s\S]*?\];/m, tableReplacement);

fs.writeFileSync(file, code);
