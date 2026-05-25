const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const isEligibleStr = `
const isEligibleForDispatch = (order: any) => {
    const s = order.status?.toLowerCase();
    const validStatuses = [
        ORDER_STATUSES.APPROVED,
        ORDER_STATUSES.EMBROIDERY,
        ORDER_STATUSES.PRINTING,
        ORDER_STATUSES.DYEING,
        ORDER_STATUSES.READY
    ];
    return validStatuses.includes(s);
};
`;

if (!content.includes('isEligibleForDispatch')) {
    // Inject at the top of the file after imports
    content = content.replace(
        "export default function OrdersTable",
        isEligibleStr + "\nexport default function OrdersTable"
    );
}

// Replace readyOrders logic
content = content.replace(
    /const readyOrders = orders\.filter\(o => \{[\s\S]*?\}\);/,
    `const readyOrders = orders.filter(o => isEligibleForDispatch(o));`
);

// In OrderTableRow, wrap checkbox in isEligibleForDispatch check
const rowCheckboxStr = `<td className={styles.tdCheckbox}>
                    <input 
                        type="checkbox" 
                        className={styles.rowCheckbox}
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (onToggleSelect) onToggleSelect(order.id);
                        }}
                    />
                </td>`;

const newRowCheckboxStr = `<td className={styles.tdCheckbox}>
                    {isEligibleForDispatch(order) && (
                        <input 
                            type="checkbox" 
                            className={styles.rowCheckbox}
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                if (onToggleSelect) onToggleSelect(order.id);
                            }}
                        />
                    )}
                </td>`;

content = content.replace(rowCheckboxStr, newRowCheckboxStr);

// In OrderMobileCard, wrap checkbox
const mobileCheckboxStr = `<div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                        type="checkbox" 
                        className={styles.rowCheckbox}
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (onToggleSelect) onToggleSelect(order.id);
                        }}
                        style={{ marginTop: 0 }}
                    />
                    <div>`;

const newMobileCheckboxStr = `<div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isEligibleForDispatch(order) && (
                        <input 
                            type="checkbox" 
                            className={styles.rowCheckbox}
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                if (onToggleSelect) onToggleSelect(order.id);
                            }}
                            style={{ marginTop: 0 }}
                        />
                    )}
                    <div>`;

content = content.replace(mobileCheckboxStr, newMobileCheckboxStr);

fs.writeFileSync(file, content);
console.log("Patched OrdersTable checkboxes");
