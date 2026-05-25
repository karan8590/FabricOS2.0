const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    'export default function OrdersTable({',
    `        </div>
    );
});
OrderMobileCard.displayName = 'OrderMobileCard';

export default function OrdersTable({`
);

fs.writeFileSync(file, content);
console.log("Restored braces in OrdersTable");
