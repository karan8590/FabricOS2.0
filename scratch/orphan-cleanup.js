const Database = require('better-sqlite3');
const db = new Database('/Users/karandhameliya/Desktop/ag/FabricOS/database.db');
const orphans = db.prepare(`
    SELECT h.id, h.material_id, h.quantity 
    FROM inventory_history h 
    LEFT JOIN orders o ON h.linked_order_id = o.id 
    WHERE h.action_type = 'Reserved' AND h.linked_order_id IS NOT NULL AND o.id IS NULL
`).all();
console.log('Found orphans:', orphans);
