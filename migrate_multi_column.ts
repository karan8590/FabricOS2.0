import { getDatabase } from './lib/db';

const db = getDatabase();

console.log('Adding columns...');

(async () => {
try {
    await db.prepare(`ALTER TABLE orders ADD COLUMN order_stage VARCHAR(50) DEFAULT 'order_added'`).run();
} catch (e: any) {
    if (!e.message.includes('duplicate column name')) console.error(e);
}
try {
    await db.prepare(`ALTER TABLE orders ADD COLUMN embroidery_status VARCHAR(50)`).run();
} catch (e: any) {
    if (!e.message.includes('duplicate column name')) console.error(e);
}
try {
    await db.prepare(`ALTER TABLE orders ADD COLUMN printing_status VARCHAR(50)`).run();
} catch (e: any) {
    if (!e.message.includes('duplicate column name')) console.error(e);
}
try {
    await db.prepare(`ALTER TABLE orders ADD COLUMN dyeing_status VARCHAR(50)`).run();
} catch (e: any) {
    if (!e.message.includes('duplicate column name')) console.error(e);
}
try {
    await db.prepare(`ALTER TABLE orders ADD COLUMN dispatch_status VARCHAR(50)`).run();
} catch (e: any) {
    if (!e.message.includes('duplicate column name')) console.error(e);
}

console.log('Migrating data...');

// Maps current_stage to new columns
// order_added: order_stage = 'order_added'
// approved: order_stage = 'approved'
// embroidery_queue: order_stage = 'embroidery', embroidery_status = 'queued_delivery' 
// printing_started: order_stage = 'printing', printing_status = 'pending' (Wait, or embroidery_status='completed' & printing_status='in_progress')
// dyeing_queue: order_stage = 'dyeing', dyeing_status = 'queued_delivery'
// ready: order_stage = 'ready'
// out_for_delivery: order_stage = 'out_for_delivery'
// delivered: order_stage = 'delivered'

const orders = (await db.prepare(`SELECT id, current_stage FROM orders`).all()) as any[];

let updated = 0;
const updateStmt = db.prepare(`
    UPDATE orders 
    SET order_stage = ?, embroidery_status = ?, printing_status = ?, dyeing_status = ?, dispatch_status = ?
    WHERE id = ?
`);

for (const order of orders) {
    let order_stage = 'order_added';
    let emb_status = null;
    let print_status = null;
    let dye_status = null;
    let disp_status = null;

    switch (order.current_stage) {
        case 'order_added':
            order_stage = 'order_added';
            break;
        case 'approved':
            order_stage = 'approved';
            break;
        case 'embroidery_queue':
            order_stage = 'embroidery';
            emb_status = 'in_progress'; // because it was previously generic queue, let's assume it was already delivered
            break;
        case 'printing_started':
            order_stage = 'printing';
            emb_status = 'completed';
            print_status = 'in_progress';
            break;
        case 'dyeing_queue':
            order_stage = 'dyeing';
            emb_status = 'completed';
            print_status = 'completed';
            dye_status = 'in_progress';
            break;
        case 'ready':
            order_stage = 'ready';
            emb_status = 'completed';
            print_status = 'completed';
            dye_status = 'completed';
            break;
        case 'out_for_delivery':
            order_stage = 'out_for_delivery';
            break;
        case 'delivered':
            order_stage = 'delivered';
            break;
    }

    await updateStmt.run(order_stage, emb_status, print_status, dye_status, disp_status, order.id);
    updated++;
}

console.log(`Migrated ${updated} orders successfully.`);
})();
