const Database = require('better-sqlite3');
const db = new Database('data/fabricos.db');

try {
  db.prepare("UPDATE orders SET status = 'embroidery_in_progress' WHERE id = 531").run();
  console.log("Success!");
} catch(e) {
  console.error("Failed:", e);
}
