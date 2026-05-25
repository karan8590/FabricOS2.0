const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/orders/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the misplaced generateChallan block + stray imports between it and the component
const badBlock = `
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
    
import { formatCurrencySafe } from '@/lib/utils';
import { Loader2 } from 'lucide-react';`;

const goodImports = `
import { formatCurrencySafe } from '@/lib/utils';
import { Loader2 } from 'lucide-react';`;

content = content.replace(badBlock, goodImports);

// 2. Now insert generateChallan INSIDE the component, just before "const widgetConfig"
const insertAnchor = `    const widgetConfig = [`;
const generateChallanFn = `    const generateChallan = async () => {
        try {
            const res = await fetch('/api/challans/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: Array.from(selectedIds),
                    challanType: 'dispatch'
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to generate challan');
            }
            
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
            
            alert('Challan generated successfully!');
            fetchOrders();
            clearSelection();
        } catch (error: any) {
            console.error('Error generating challan:', error);
            alert(error.message || 'Error generating challan. Please check console.');
        }
    };

    `;

if (!content.includes('const generateChallan = async')) {
    content = content.replace(insertAnchor, generateChallanFn + insertAnchor);
}

fs.writeFileSync(file, content);
console.log('Fixed: generateChallan moved into component scope');
