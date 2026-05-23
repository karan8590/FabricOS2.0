const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='role_permissions'").get();
console.log(tableInfo ? tableInfo.sql : 'Table not found');

db.close();
