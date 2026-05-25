const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/dispatch/CreateDispatchModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update Order interface
code = code.replace(
    'design_name: string;\n}',
    'design_name: string;\n    queued_vendor_id?: number;\n    vendor_name?: string;\n    queued_rate?: number;\n    queued_expected_date?: string;\n}'
);

// Modify handleNext to skip step 3 if embroidery/dyeing
const handleNextSearch = `        if (step === 2 && selectedOrderIds.size === 0) return alert('Select at least one order');
        if (step === 3) {
            // Validate
            if (type === 'embroidery' || type === 'dyeing') {
                for (const id of Array.from(selectedOrderIds)) {
                    const c = orderConfigs[id];
                    if (!c?.vendorId) return alert(\`Select vendor for order \${availableOrders.find(o => o.id === id)?.order_number}\`);
                    if (!c?.ratePerMetre) return alert(\`Enter rate for order \${availableOrders.find(o => o.id === id)?.order_number}\`);
                }
            } else {
                if (!customerConfig.transporter) return alert('Enter transporter name');
            }
        }
        setStep(s => s + 1);`;

const handleNextReplace = `        if (step === 2 && selectedOrderIds.size === 0) return alert('Select at least one order');
        if (step === 2 && (type === 'embroidery' || type === 'dyeing')) {
            // Ensure all selected orders have the same vendor for batching
            let firstVendorId = null;
            for (const id of Array.from(selectedOrderIds)) {
                const order = availableOrders.find(o => o.id === id);
                if (firstVendorId === null) firstVendorId = order?.queued_vendor_id;
                else if (firstVendorId !== order?.queued_vendor_id) {
                    return alert('All selected orders must belong to the same vendor to create a dispatch batch.');
                }
            }
            // Skip Step 3 for internal vendors as they are already configured!
            setStep(4);
            return;
        }
        if (step === 3) {
            // Validate
            if (type === 'customer') {
                if (!customerConfig.transporter) return alert('Enter transporter name');
            }
        }
        setStep(s => s + 1);`;
code = code.replace(handleNextSearch, handleNextReplace);

// Update payload submission to use queued data
const payloadSearch = `                return {
                    orderId: id,
                    quantity: order.quantity,
                    vendorId: c.vendorId ? parseInt(c.vendorId) : undefined,
                    vendorName: vendorName,
                    ratePerMetre: c.ratePerMetre ? parseFloat(c.ratePerMetre) : undefined,
                    totalCost: c.ratePerMetre ? parseFloat(c.ratePerMetre) * order.quantity : undefined,
                    paymentDueDate: c.paymentDueDate
                };`;
                
const payloadReplace = `                if (type === 'embroidery' || type === 'dyeing') {
                    return {
                        orderId: id,
                        quantity: order.quantity,
                        vendorId: order.queued_vendor_id,
                        vendorName: order.vendor_name,
                        ratePerMetre: order.queued_rate,
                        totalCost: (order.queued_rate || 0) * (order.quantity || 0),
                        expectedReturnDate: order.queued_expected_date
                    };
                }
                return {
                    orderId: id,
                    quantity: order.quantity,
                    vendorId: c.vendorId ? parseInt(c.vendorId) : undefined,
                    vendorName: vendorName,
                    ratePerMetre: c.ratePerMetre ? parseFloat(c.ratePerMetre) : undefined,
                    totalCost: c.ratePerMetre ? parseFloat(c.ratePerMetre) * order.quantity : undefined,
                    paymentDueDate: c.paymentDueDate
                };`;
code = code.replace(payloadSearch, payloadReplace);

// Fix summary for internal vendors
const summarySearch = `                    <p>Total Cost: <strong>{formatCurrencySafe(Array.from(selectedOrderIds).reduce((acc, id) => acc + ((parseFloat(orderConfigs[id]?.ratePerMetre) || 0) * (availableOrders.find(o => o.id === id)?.quantity || 0)), 0))}</strong></p>`;

const summaryReplace = `                    <p>Total Cost: <strong>{formatCurrencySafe(Array.from(selectedOrderIds).reduce((acc, id) => {
                        const o = availableOrders.find(o => o.id === id);
                        if (type === 'embroidery' || type === 'dyeing') return acc + ((o?.queued_rate || 0) * (o?.quantity || 0));
                        return acc + ((parseFloat(orderConfigs[id]?.ratePerMetre) || 0) * (o?.quantity || 0));
                    }, 0))}</strong></p>`;
code = code.replace(summarySearch, summaryReplace);

fs.writeFileSync(file, code);
