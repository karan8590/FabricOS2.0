import Database from 'better-sqlite3';

const db = new Database('data/fabricos.db');

// 1. Migrate old descriptions and categories
const expenses = db.prepare(`SELECT * FROM expenses WHERE category = 'Inventory' OR category = 'Miscellaneous' OR category = 'MISCELLANEOUS' OR description LIKE 'Purchase of%'`).all();

console.log(`Found ${expenses.length} expenses to migrate...`);

let updated = 0;
for (const exp of expenses) {
    let newCategory = exp.category;
    let newDesc = exp.description;
    
    // Parse description
    // Example: Purchase of 100 m Polyester
    const match = newDesc?.match(/Purchase of ([\d.]+) (\w+) (.+)/i);
    if (match) {
        const qty = match[1];
        const unit = match[2];
        const name = match[3].trim();
        
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('polyester') || lowerName.includes('fabric') || lowerName.includes('cotton') || lowerName.includes('silk')) {
            newCategory = 'FABRIC PURCHASE';
            newDesc = `Inventory Purchase — ${name} Fabric (${qty}${unit})`;
        } else if (lowerName.includes('ink')) {
            newCategory = 'PRINTING INK';
            newDesc = `Ink Procurement — ${name} (${qty}${unit})`;
        } else if (lowerName.includes('packaging')) {
            newCategory = 'PACKAGING MATERIAL';
            newDesc = `Packaging Procurement — ${name} (${qty}${unit})`;
        } else {
            newCategory = 'FABRIC PURCHASE';
            newDesc = `Inventory Purchase — ${name} (${qty}${unit})`;
        }
        
        db.prepare('UPDATE expenses SET category = ?, description = ? WHERE id = ?').run(newCategory, newDesc, exp.id);
        updated++;
    }
}

// 2. Also ensure paymentMode is Vendor Credit instead of Cash (INV-PUR...)
// Actually, earlier the DB stored reference in `reference` and paymentMode in `paymentMode`
db.prepare(`UPDATE expenses SET paymentMode = 'Vendor Credit' WHERE paymentMode = 'Cash' AND reference LIKE 'INV-PUR-%'`).run();

console.log(`Updated ${updated} expenses! Migration complete.`);
