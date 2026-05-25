import getDatabase from '../lib/db';

async function run() {
    const db = getDatabase();
    try {
        console.log("Dropping global unique constraint...");
        await db.prepare('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_key').run();
        console.log("Adding per-business unique constraint...");
        await db.prepare('ALTER TABLE orders ADD CONSTRAINT orders_business_order_number_key UNIQUE (business_id, order_number)').run();
        console.log("Done!");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
