const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('bulkDispatchModalType && (')) {
    content = content.replace(
        '<EditOrderModal',
        `{bulkDispatchModalType && (
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
            )}\n            <EditOrderModal`
    );
}

fs.writeFileSync(file, content);
console.log("Patched OrdersPage");
