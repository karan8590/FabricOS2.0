const db = require('better-sqlite3')('/Users/karandhameliya/Desktop/ag/FabricOS/database.db');
console.log(db.pragma('table_info(orders)'));
