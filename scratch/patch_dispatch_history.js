const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/dispatch/DispatchHistorySection.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update filters array and mapping
content = content.replace(
    /{?\['all', 'embroidery', 'dyeing', 'customer', 'in_transit', 'completed', 'overdue'\].map\(filter =>/g,
    `{[
        { id: 'all', label: 'Recent Dispatches' },
        { id: 'vendor', label: 'Vendor Challans' },
        { id: 'customer', label: 'Customer Deliveries' },
        { id: 'returned', label: 'Returned Materials' }
    ].map(filter =>`
);

// Update filter render
content = content.replace(
    /key={filter}\s+className={`\${styles.tab} \${activeFilter === filter \? styles.activeTab : ''}`}\s+style={{ padding: '6px 12px', border: '1px solid transparent', borderRadius: '16px', background: activeFilter === filter \? '#eef2ff' : '#f1f5f9' }}\s+onClick={\(\) => setActiveFilter\(filter\)}\s+>\s+{filter.replace\('_', ' '\).replace\(\/\\b\\w\/g, l => l.toUpperCase\(\)\)}\s+<\/button>/,
    `key={filter.id}
                                className={\`\${styles.tab} \${activeFilter === filter.id ? styles.activeTab : ''}\`} 
                                style={{ padding: '6px 12px', border: '1px solid transparent', borderRadius: '16px', background: activeFilter === filter.id ? '#eef2ff' : '#f1f5f9', fontWeight: activeFilter === filter.id ? 600 : 500, color: activeFilter === filter.id ? '#4338ca' : '#475569' }}
                                onClick={() => setActiveFilter(filter.id)}
                            >
                                {filter.label}
                            </button>`
);

// Update useMemo filter logic
content = content.replace(
    /if \(activeFilter === 'embroidery'\) return d.dispatch_type === 'embroidery';[\s\S]*?return true;/g,
    `if (activeFilter === 'vendor') return d.dispatch_type === 'embroidery' || d.dispatch_type === 'dyeing';
            if (activeFilter === 'customer') return d.dispatch_type === 'customer';
            if (activeFilter === 'returned') return d.status === 'partially_returned' || d.status === 'returned';
            return true;`
);

// Update table render
content = content.replace(
    /<td>{dispatch.items.length} orders \({totalMeters}m\)<\/td>/g,
    `<td>{dispatch.total_orders || 0} orders ({dispatch.total_meters || 0}m)</td>`
);

// Update destination render
content = content.replace(
    /let destination = '';[\s\S]*?destination = vendors.join\(\', \'\) \|\| \'Vendor\';\s*\}/g,
    `let destination = '';
                                        if (dispatch.dispatch_type === 'customer') {
                                            destination = dispatch.transporter ? \`\${dispatch.transporter} (LR: \${dispatch.lr_number})\` : 'Customer';
                                        } else {
                                            destination = dispatch.vendor_name || 'Vendor';
                                        }`
);

// Simplify inner table (since items might not be sent anymore)
content = content.replace(
    /dispatch.items.map/g,
    `(dispatch.items || []).map`
);

fs.writeFileSync(file, content);
console.log("Patched DispatchHistorySection");
