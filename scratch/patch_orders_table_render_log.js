const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("console.log('OrdersTable rendering modals, workflowActionState:'")) {
    content = content.replace(
        "return (\n        <div className={styles.tableContainer}>",
        "console.log('OrdersTable rendering modals, workflowActionState:', workflowActionState);\n    return (\n        <div className={styles.tableContainer}>"
    );
    fs.writeFileSync(file, content);
    console.log("Patched render log");
} else {
    console.log("Already patched");
}
