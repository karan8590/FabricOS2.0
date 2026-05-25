const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const toolbarRegex = /\{selectedIds\.size > 0 && \([\s\S]*?<div style=\{\{[\s\S]*?zIndex: 50\s*\}\}>[\s\S]*?\{selectedIds\.size\} selected\s*<\/span>[\s\S]*?<\/div>\s*\)\}/;

const newToolbarStr = `{selectedIds.size > 0 && (
                <div style={{ 
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px',
                    padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    zIndex: 50
                }}>
                    <span style={{ fontWeight: 600, color: '#0F172A', marginRight: '8px' }}>
                        {selectedIds.size} selected
                    </span>
                    <button className={styles.btnSecondary} onClick={generateChallan} style={{ background: '#FFFFFF' }}>
                        Generate Challan
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setBulkDispatchModalType('customer')}>
                        Deliver
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#E2E8F0', margin: '0 8px' }}></div>
                    <button onClick={clearSelection} style={{ 
                        background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', 
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500 
                    }}>
                        <X size={16} /> Clear
                    </button>
                </div>
            )}`;

content = content.replace(toolbarRegex, newToolbarStr);

// add generateChallan function stub if not exists
if (!content.includes('const generateChallan = async () => {')) {
    const importStr = `import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';`;
    const funcStr = `
    const generateChallan = async () => {
        try {
            const res = await fetch('/api/challans/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: Array.from(selectedIds),
                    challanType: 'dispatch'
                })
            });
            if (!res.ok) throw new Error('Failed to generate challan');
            
            // Download PDF
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`Challan_\${new Date().getTime()}.pdf\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            alert('Challan Generated successfully!');
            fetchOrders();
            clearSelection();
        } catch (error) {
            console.error('Error generating challan:', error);
            alert('Error generating challan. Please check console.');
        }
    };
    `;
    content = content.replace(importStr, importStr + '\n' + funcStr);
}

fs.writeFileSync(file, content);
console.log("Patched page.tsx bulk toolbar");
