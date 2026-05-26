import { getDatabase } from './lib/db';

const db = getDatabase();

const info = db.prepare(`
    UPDATE orders
    SET current_stage = 'order_added'
    WHERE status = 'created' AND (current_stage IS NULL OR current_stage = 'approved')
`).run();

console.log('Fixed orders:', info.changes);
