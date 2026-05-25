const Database = require('sqlite3').verbose();
const db = new Database('/Users/karandhameliya/Desktop/ag/FabricOS/database.db');
db.all("SELECT id, order_number, dispatch_stage FROM orders WHERE dispatch_stage IS NOT NULL", (err, rows) => {
    if(err) console.error(err);
    console.log("Queued orders:", rows);
});
