const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /{bulkDispatchModalType && \([\s\S]*?<\/CreateDispatchModal>\s*\)\s*}/;

const replacement = `{bulkDispatchModalType === 'customer' && (
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
            )}
            
            {(bulkDispatchModalType === 'embroidery' || bulkDispatchModalType === 'dyeing') && (
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
            )}`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log("Patched Modals in OrdersPage");
