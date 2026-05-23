const db = require('better-sqlite3')('/Users/karandhameliya/Desktop/ag/FabricOS/lib/db/fabric_os.db');

const rows = db.prepare("SELECT * FROM settings").all();
console.log(rows);
