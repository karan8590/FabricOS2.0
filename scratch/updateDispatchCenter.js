const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/api/dispatch-center/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Add imports for telegram and PDF
if (!code.includes('generateVendorChallanPDFServer')) {
    code = code.replace("import { sendTelegramMessage } from '@/lib/telegram';", 
    "import { sendTelegramMessage, sendTelegramDocument } from '@/lib/telegram';\nimport { generateVendorChallanPDFServer } from '@/lib/pdf/generateVendorChallanServer';");
}

// Replace the Notification section
const searchSection = `        // 3. Send Telegram Notification
        try {
            let message = '';
            if (dispatchType === 'embroidery') {
                message = \`🪡 Dispatched to embroidery — \${orders.length} orders, \${totalMetres}m to \${Array.from(vendorNames).join(', ')}.\`;
            } else if (dispatchType === 'dyeing') {
                message = \`🎨 Dispatched to dyeing — \${orders.length} orders, \${totalMetres}m to \${Array.from(vendorNames).join(', ')}. Due back: \${expectedReturnDate || 'N/A'}\`;
            } else {
                message = \`🚚 Dispatched to customer — \${orders.length} orders, \${totalMetres}m. LR: \${lrNumber || 'N/A'} via \${transporter || 'N/A'}\`;
            }
            // Send asynchronously
            sendTelegramMessage(message, businessId).catch(console.error);
        } catch (e) {}`;

const replaceSection = `        // 3. Send Telegram Notification & PDF
        try {
            let message = '';
            if (dispatchType === 'embroidery' || dispatchType === 'dyeing') {
                const processLabel = dispatchType === 'embroidery' ? 'Embroidery' : 'Dyeing';
                message = \`🪡 Dispatched to \${processLabel} — \${orders.length} orders, \${totalMetres}m to \${Array.from(vendorNames).join(', ')}.\`;
                
                // Fetch order details for PDF
                const orderDetails = await db.prepare(\`SELECT o.id, o.order_number, d.name as design_name, o.fabric_type FROM orders o LEFT JOIN designs d ON o.design_id = d.id WHERE o.id IN (\${orderIds.join(',')})\`).all() as any[];
                
                const pdfOrders = orders.map(o => {
                    const detail = orderDetails.find(od => od.id === o.orderId) || {};
                    return {
                        order_number: detail.order_number || \`ORD-\${o.orderId}\`,
                        design_name: detail.design_name || 'Standard',
                        fabric_type: detail.fabric_type || 'Polyester',
                        quantity: o.quantity || 0,
                        rate_per_meter: o.ratePerMetre || 0,
                        total_cost: o.totalCost || 0
                    };
                });
                
                const business = await db.prepare('SELECT name, phone, gst_number as gstin, address, logo_url FROM businesses WHERE id = ?').get(businessId) as any;

                const pdfData = {
                    dispatch_number: dispatchNumber,
                    sent_date: dispatchDateTs,
                    vendor_name: Array.from(vendorNames).join(', '),
                    process_type: dispatchType,
                    expected_return_date: expectedReturnDateTs,
                    quantity: totalMetres,
                    rate_per_meter: 0,
                    total_cost: 0,
                    orders: pdfOrders,
                    seller_name: business?.name,
                    seller_phone: business?.phone,
                    seller_gstin: business?.gstin,
                    seller_address: business?.address,
                    seller_logo: business?.logo_url
                };
                
                const { buffer } = await generateVendorChallanPDFServer(pdfData);
                await sendTelegramDocument(buffer, \`\${dispatchNumber}.pdf\`, message, 'vendor_alerts');
                await db.prepare('UPDATE dispatches SET telegram_sent = 1 WHERE id = ?').run(newDispatch.id);
            } else {
                message = \`🚚 Dispatched to customer — \${orders.length} orders, \${totalMetres}m. LR: \${lrNumber || 'N/A'} via \${transporter || 'N/A'}\`;
                sendTelegramMessage(message, 'instant_order_alerts').catch(console.error);
            }
        } catch (e) { console.error('Telegram/PDF Error:', e); }`;

code = code.replace(searchSection, replaceSection);
fs.writeFileSync(file, code);
