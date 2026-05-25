const Database = require('better-sqlite3');
const db = new Database('/Users/karandhameliya/Desktop/ag/FabricOS/appDataDir_test.db', { memory: true });
db.exec('CREATE TABLE test (id INTEGER, linked_order_id INTEGER)');
db.exec('INSERT INTO test VALUES (1, 20)');
const changes1 = db.prepare('DELETE FROM test WHERE linked_order_id = ?').run('20').changes;
console.log('Deleted string "20":', changes1);
