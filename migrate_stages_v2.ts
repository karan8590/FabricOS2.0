import { Pool } from 'pg';

async function runMigration() {
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
        console.error('DATABASE_URL is required');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Starting data migration for v2 stages...');

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Updating to order_added');
            await client.query(`UPDATE orders SET current_stage = 'order_added' WHERE current_stage IN ('pending', 'created', 'draft')`);
            
            console.log('Updating to approved');
            await client.query(`UPDATE orders SET current_stage = 'approved' WHERE current_stage IN ('approved', 'inventory_reserved')`);
            
            console.log('Updating to embroidery_queue');
            await client.query(`UPDATE orders SET current_stage = 'embroidery_queue' WHERE current_stage = 'sent_to_embroidery'`);
            
            console.log('Updating to printing_started');
            await client.query(`UPDATE orders SET current_stage = 'printing_started' WHERE current_stage IN ('embroidery_completed', 'sent_to_printing')`);
            
            console.log('Updating to dyeing_queue');
            await client.query(`UPDATE orders SET current_stage = 'dyeing_queue' WHERE current_stage IN ('printing_completed', 'sent_to_dyeing')`);
            
            console.log('Updating to ready');
            await client.query(`UPDATE orders SET current_stage = 'ready' WHERE current_stage IN ('dyeing_completed', 'quality_check', 'ready_for_dispatch')`);
            
            console.log('Updating to out_for_delivery');
            await client.query(`UPDATE orders SET current_stage = 'out_for_delivery' WHERE current_stage = 'dispatched'`);
            
            console.log('Updating to delivered');
            await client.query(`UPDATE orders SET current_stage = 'delivered' WHERE current_stage IN ('delivered', 'completed')`);
            
            console.log('Checking for any unmapped stages...');
            const unmapped = await client.query(`
                SELECT DISTINCT current_stage 
                FROM orders 
                WHERE current_stage NOT IN (
                    'order_added', 'approved', 'embroidery_queue', 'printing_started', 
                    'dyeing_queue', 'ready', 'out_for_delivery', 'delivered'
                )
            `);
            if (unmapped.rows.length > 0) {
                console.warn('WARNING: Found unmapped stages:', unmapped.rows);
            } else {
                console.log('All orders successfully mapped to v2 stages!');
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        
        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

runMigration();
