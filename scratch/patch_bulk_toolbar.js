const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldToolbarStr = `<button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('embroidery')} style={{ background: '#FFFFFF' }}>Send to Embroidery</button>
                    <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('dyeing')} style={{ background: '#FFFFFF' }}>Send to Dyeing</button>
                    <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('printing')} style={{ background: '#FFFFFF' }}>Send to Printing</button>
                    <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('customer')} style={{ background: '#FFFFFF' }}>Dispatch to Customer</button>
                    <button className={styles.btnGhost} onClick={() => alert('Challan generation coming soon...')} style={{ background: '#FFFFFF', color: '#0F172A', fontWeight: 500, fontSize: '13px' }}>Generate Challan</button>`;

const newToolbarStr = `{(() => {
                        const selectedOrderObjs = allOrders.filter(o => selectedIds.has(o.id));
                        const statuses = new Set(selectedOrderObjs.map(o => o.status?.toLowerCase() || 'created'));
                        if (statuses.size > 1) {
                            return <span style={{ color: '#EF4444', fontSize: '13px', fontWeight: 500, margin: '0 8px' }}>Cannot mix different dispatch stages.</span>;
                        }
                        if (statuses.size === 1) {
                            const status = Array.from(statuses)[0];
                            if (status === 'approved') return <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('embroidery')} style={{ background: '#FFFFFF' }}>Send to Embroidery</button>;
                            if (status === 'printing' || status === 'printing_in_factory') return <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('dyeing')} style={{ background: '#FFFFFF' }}>Send to Dyeing</button>;
                            if (status === 'ready') return <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('customer')} style={{ background: '#FFFFFF' }}>Dispatch to Customer</button>;
                            return <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 500, margin: '0 8px' }}>No bulk action available for this status.</span>;
                        }
                        return null;
                    })()}
                    <button className={styles.btnGhost} onClick={() => alert('Challan generation coming soon...')} style={{ background: '#FFFFFF', color: '#0F172A', fontWeight: 500, fontSize: '13px' }}>Generate Challan</button>`;

content = content.replace(oldToolbarStr, newToolbarStr);

fs.writeFileSync(file, content);
console.log("Patched bulk toolbar in page.tsx");
