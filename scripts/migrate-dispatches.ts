import getDatabase from '../lib/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    const db = getDatabase();
    
    // 1. Apply schema changes
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'lib/db/schema.sql'), 'utf-8');
    
    // Extract only the new unified tables part to execute
    const unifiedSchema = `
        CREATE TABLE IF NOT EXISTS dispatches (
        id SERIAL PRIMARY KEY,
        business_id TEXT DEFAULT 'business_001',
        dispatch_number TEXT NOT NULL UNIQUE,
        dispatch_type TEXT NOT NULL CHECK(dispatch_type IN ('embroidery', 'dyeing', 'customer')),
        is_bulk BOOLEAN DEFAULT FALSE,
        transporter TEXT,
        lr_number TEXT,
        dispatch_date INTEGER NOT NULL,
        expected_return_date INTEGER,
        expected_delivery_date INTEGER,
        status TEXT NOT NULL CHECK(status IN ('in_transit', 'partially_returned', 'completed', 'overdue', 'cancelled')) DEFAULT 'in_transit',
        created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
        );

        CREATE INDEX IF NOT EXISTS idx_dispatches_business ON dispatches(business_id);
        CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);

        CREATE TABLE IF NOT EXISTS dispatch_items (
        id SERIAL PRIMARY KEY,
        business_id TEXT DEFAULT 'business_001',
        dispatch_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL,
        vendor_id INTEGER,
        rate_per_metre NUMERIC DEFAULT 0,
        total_cost NUMERIC DEFAULT 0,
        payment_due_date INTEGER,
        status TEXT NOT NULL CHECK(status IN ('in_transit', 'returned', 'delivered', 'cancelled')) DEFAULT 'in_transit',
        returned_meters NUMERIC DEFAULT 0,
        quality_notes TEXT,
        challan_id INTEGER,
        created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
        FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON dispatch_items(dispatch_id);
        CREATE INDEX IF NOT EXISTS idx_dispatch_items_order ON dispatch_items(order_id);
    `;

    try {
        console.log('Running unified schema...');
        await db.exec(unifiedSchema);
        console.log('Unified schema applied successfully.');
    } catch (err) {
        console.error('Error applying unified schema:', err);
    }

    try {
        console.log('Migrating vendor_dispatches (embroidery/dyeing)...');
        // Fetch all vendor_dispatches
        const vendorDispatches: any[] = await db.prepare('SELECT * FROM vendor_dispatches').all();
        console.log(`Found ${vendorDispatches.length} vendor dispatches to migrate.`);

        for (const vd of vendorDispatches) {
            // Check if already migrated
            const existing = await db.prepare('SELECT id FROM dispatches WHERE dispatch_number = ?').get(vd.dispatch_number);
            if (existing) continue;

            // Map old status to new status
            let newDispatchStatus = 'in_transit';
            let newItemStatus = 'in_transit';
            if (vd.status === 'returned') {
                newDispatchStatus = 'completed';
                newItemStatus = 'returned';
            } else if (vd.status === 'cancelled') {
                newDispatchStatus = 'cancelled';
                newItemStatus = 'cancelled';
            }

            // Create dispatch
            const newDispatch = await db.prepare(`
                INSERT INTO dispatches (business_id, dispatch_number, dispatch_type, is_bulk, dispatch_date, expected_return_date, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            `).get(vd.business_id, vd.dispatch_number, vd.process_type, false, vd.sent_date, vd.expected_return_date, newDispatchStatus, vd.created_at) as {id: number};

            // Create dispatch_item
            await db.prepare(`
                INSERT INTO dispatch_items (business_id, dispatch_id, order_id, vendor_id, rate_per_metre, total_cost, status, returned_meters, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(vd.business_id, newDispatch.id, vd.order_id, vd.vendor_id, vd.rate_per_meter, vd.total_cost, newItemStatus, vd.status === 'returned' ? vd.total_meters : 0, vd.created_at);
        }
        console.log('vendor_dispatches migration completed.');
    } catch (err) {
        console.error('Error migrating vendor_dispatches:', err);
    }

    try {
        console.log('Migrating dispatch_batches (customers)...');
        const dispatchBatches: any[] = await db.prepare('SELECT * FROM dispatch_batches').all();
        console.log(`Found ${dispatchBatches.length} dispatch batches to migrate.`);

        for (const dbatch of dispatchBatches) {
            const existing = await db.prepare('SELECT id FROM dispatches WHERE dispatch_number = ?').get(dbatch.dispatch_number);
            if (existing) continue;

            let newStatus = 'in_transit';
            if (dbatch.status === 'delivered') newStatus = 'completed';

            // Convert YYYY-MM-DD to timestamp
            let dispatchDateTs = Math.floor(Date.now() / 1000);
            if (dbatch.dispatch_date) {
                dispatchDateTs = Math.floor(new Date(dbatch.dispatch_date).getTime() / 1000);
            }

            // Create dispatch
            const newDispatch = await db.prepare(`
                INSERT INTO dispatches (business_id, dispatch_number, dispatch_type, is_bulk, transporter, lr_number, dispatch_date, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            `).get(dbatch.business_id, dbatch.dispatch_number, 'customer', true, dbatch.driver_name, dbatch.vehicle_number, dispatchDateTs, newStatus, dbatch.created_at) as {id: number};

            // Fetch related orders
            const orders: any[] = await db.prepare('SELECT * FROM dispatch_orders WHERE dispatch_id = ?').all(dbatch.id);
            for (const order of orders) {
                let itemStatus = 'in_transit';
                if (order.delivery_status === 'delivered' || dbatch.status === 'delivered') {
                    itemStatus = 'delivered';
                }

                await db.prepare(`
                    INSERT INTO dispatch_items (business_id, dispatch_id, order_id, status, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run(order.business_id, newDispatch.id, order.order_id, itemStatus, order.created_at);
            }
        }
        console.log('dispatch_batches migration completed.');
    } catch (err) {
        console.error('Error migrating dispatch_batches:', err);
    }

    console.log('Done.');
    process.exit(0);
}

migrate();
