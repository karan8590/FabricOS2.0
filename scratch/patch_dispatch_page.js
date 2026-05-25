const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/dispatch-center/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove ReadyToDispatchSection import
content = content.replace("import ReadyToDispatchSection from '@/components/dispatch/ReadyToDispatchSection';", "");

// Replace metric "Pending Dispatch" with "Total Dispatches"
content = content.replace('MetricCard title="Pending Dispatch" value={metrics.pendingCount} icon={<Clock size={20} />} trend="Orders ready"', 'MetricCard title="Total Dispatches" value={metrics.totalCount || 0} icon={<Clock size={20} />} trend="All time"');

// Remove ReadyToDispatchSection component
content = content.replace(
    /<ReadyToDispatchSection[\s\S]*?\/>/,
    ''
);

// Update fetch to only get dispatches, vendor_dispatches, delivery_logs
content = content.replace(
    /setPendingOrders\(data\.pendingOrders \|\| \[\]\);/,
    ''
);
// Also update the metrics calculation
content = content.replace(
    /const pendingCount = pendingOrders.length;/,
    'const totalCount = dispatches.length;'
);

fs.writeFileSync(file, content);
console.log("Patched DispatchCenterPage");
