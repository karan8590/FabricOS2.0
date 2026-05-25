const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/dispatch/DispatchHistorySection.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `            if (activeFilter === 'vendor') return d.dispatch_type === 'embroidery' || d.dispatch_type === 'dyeing';
            if (activeFilter === 'customer') return d.dispatch_type === 'customer';
            if (activeFilter === 'returned') return d.status === 'partially_returned' || d.status === 'returned';
            return true;
                if (d.expected_delivery_date && d.expected_delivery_date < now) return true;
                return false;
            }

            return true;`;

const newCode = `            if (activeFilter === 'vendor') return d.dispatch_type === 'embroidery' || d.dispatch_type === 'dyeing';
            if (activeFilter === 'customer') return d.dispatch_type === 'customer';
            if (activeFilter === 'returned') return d.status === 'partially_returned' || d.status === 'returned';
            
            return true;`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(file, content);
console.log("Patched Syntax Error");
