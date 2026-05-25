const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert SendToVendorModal import if not present
if (!content.includes('SendToVendorModal')) {
    content = content.replace(
        "import CreateDispatchModal from '@/components/orders/CreateDispatchModal';",
        "import CreateDispatchModal from '@/components/orders/CreateDispatchModal';\nimport SendToVendorModal from '@/components/orders/SendToVendorModal';"
    );
}

// Replace the generic CreateDispatchModal block with specific ones
const oldModalBlock = `{bulkDispatchModalType && (
                <CreateDispatchModal
                    isOpen={true}
                    onClose={() => setBulkDispatchModalType(null)}
                    selectedOrders={allOrders.filter(o => selectedIds.has(o.id))}
                    dispatchType={bulkDispatchModalType}
                    onSuccess={() => {
                        setBulkDispatchModalType(null);
                        clearSelection();
                        fetchOrders();
                    }}
                />
            )}`;

const newModalBlock = `{bulkDispatchModalType === 'embroidery' || bulkDispatchModalType === 'dyeing' ? (
                <SendToVendorModal
                    isOpen={true}
                    onClose={() => setBulkDispatchModalType(null)}
                    orders={allOrders.filter(o => selectedIds.has(o.id))}
                    action={bulkDispatchModalType === 'embroidery' ? 'send_to_embroidery' : 'send_to_dyeing'}
                    onSuccess={() => {
                        setBulkDispatchModalType(null);
                        clearSelection();
                        fetchOrders();
                    }}
                />
            ) : bulkDispatchModalType ? (
                <CreateDispatchModal
                    isOpen={true}
                    onClose={() => setBulkDispatchModalType(null)}
                    selectedOrders={allOrders.filter(o => selectedIds.has(o.id))}
                    dispatchType={bulkDispatchModalType}
                    onSuccess={() => {
                        setBulkDispatchModalType(null);
                        clearSelection();
                        fetchOrders();
                    }}
                />
            ) : null}`;

content = content.replace(oldModalBlock, newModalBlock);

fs.writeFileSync(file, content);
console.log("Patched bulk modals in page.tsx");
