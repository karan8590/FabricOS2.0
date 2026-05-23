import getDatabase from '../lib/db';

try {
    const db = getDatabase();
    console.log('Testing orders select query...');
    const result = db.prepare(`
        SELECT 
            o.id,
            o.order_number,
            c.name as customer_name,
            d.name as design_name,
            o.quantity_meters,
            o.total_price,
            o.status,
            o.delivery_date,
            COALESCE((SELECT status FROM invoices WHERE order_id = o.id LIMIT 1), 'unpaid') as invoice_status,
            COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE order_id = o.id), 0) as paid_amount
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN designs d ON o.design_id = d.id
        LIMIT 5
    `).all() as any[];

    console.log('SUCCESS querying orders:', JSON.stringify(result, null, 2));
} catch (err) {
    console.error('ERROR querying orders:', err);
}
