const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const toolbarRegex = /<button className={styles\.btnSecondary} onClick={\(\) => setBulkDispatchModalType\('embroidery'\)}[\s\S]*?Dispatch to Customer<\/button>/;

const newToolbar = `<button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('embroidery')} style={{ background: '#FFFFFF' }}>Send to Embroidery</button>
                    <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('dyeing')} style={{ background: '#FFFFFF' }}>Send to Dyeing</button>
                    <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('printing')} style={{ background: '#FFFFFF' }}>Send to Printing</button>
                    <button className={styles.btnSecondary} onClick={() => setBulkDispatchModalType('customer')} style={{ background: '#FFFFFF' }}>Dispatch to Customer</button>
                    <button className={styles.btnGhost} onClick={() => alert('Challan generation coming soon...')} style={{ background: '#FFFFFF', color: '#0F172A', fontWeight: 500, fontSize: '13px' }}>Generate Challan</button>`;

content = content.replace(toolbarRegex, newToolbar);

// Ensure printing is handled in the modal logic
const modalRegex = /bulkDispatchModalType === 'embroidery' \|\| bulkDispatchModalType === 'dyeing'/g;
content = content.replace(modalRegex, "['embroidery', 'dyeing', 'printing'].includes(bulkDispatchModalType as string)");

fs.writeFileSync(file, content);
console.log("Patched Toolbar");
