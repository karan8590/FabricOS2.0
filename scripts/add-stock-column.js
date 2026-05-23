const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

try {
    console.log('Adding stock_quantity to designs table...');
    db.prepare('ALTER TABLE designs ADD COLUMN stock_quantity REAL DEFAULT 100').run();
    
    // Randomize some stock levels
    const designs = db.prepare('SELECT id FROM designs').all();
    const update = db.prepare('UPDATE designs SET stock_quantity = ? WHERE id = ?');
    
    designs.forEach(d => {
        const stock = Math.floor(Math.random() * 200);
        update.run(stock, d.id);
    });
    
    console.log('Successfully updated designs table with stock levels.');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('Column stock_quantity already exists.');
    } else {
        console.error('Error updating table:', error);
    }
} finally {
    db.close();
}
