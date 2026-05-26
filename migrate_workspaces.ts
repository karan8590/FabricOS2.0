import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment variables manually since dotenv might not be installed
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim();
        }
    });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is missing in .env.local');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Started Migration...');

        // 0. Sync Schema
        const schema = fs.readFileSync(path.join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8');
        await client.query(schema);
        console.log('Schema synced successfully!');

        // 1. Fetch all existing businesses
        const resBusinesses = await client.query('SELECT * FROM businesses');
        const businesses = resBusinesses.rows;
        
        console.log(`Found ${businesses.length} businesses to migrate.`);

        for (const biz of businesses) {
            console.log(`Migrating business: ${biz.name} (${biz.id})`);

            // 2. Insert into workspaces
            await client.query(`
                INSERT INTO workspaces (id, workspace_name, logo_url, phone, created_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO NOTHING
            `, [
                biz.id,
                biz.name || 'Default Workspace',
                biz.logo_url || null,
                biz.phone || null,
                biz.created_at || Math.floor(Date.now() / 1000)
            ]);

            // 3. Create default firm for this workspace
            const resFirm = await client.query(`
                INSERT INTO firms (
                    workspace_id, firm_name, gst_number, phone, address, logo_url, is_default, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, true, $7)
                RETURNING id
            `, [
                biz.id,
                biz.name || 'Default Firm',
                biz.gst_number || null,
                biz.phone || null,
                biz.address || null,
                biz.logo_url || null,
                biz.created_at || Math.floor(Date.now() / 1000)
            ]);

            const firmId = resFirm.rows[0].id;
            console.log(`Created default Firm ID: ${firmId} for workspace ${biz.id}`);

            // 4. Create firm snapshot JSON
            const firmSnapshot = JSON.stringify({
                firm_name: biz.name || 'Default Firm',
                gst_number: biz.gst_number || null,
                phone: biz.phone || null,
                address: biz.address || null,
                logo_url: biz.logo_url || null,
                bank_name: null,
                account_number: null,
                ifsc_code: null
            });

            // 5. Update orders for this business
            const resOrders = await client.query(`
                UPDATE orders 
                SET billing_firm_id = $1
                WHERE business_id = $2 AND billing_firm_id IS NULL
            `, [firmId, biz.id]);
            console.log(`Updated ${resOrders.rowCount} orders for business ${biz.id}`);

            // 6. Update invoices
            const resInvoices = await client.query(`
                UPDATE invoices 
                SET billing_firm_id = $1, firm_snapshot = $2
                WHERE business_id = $3 AND billing_firm_id IS NULL
            `, [firmId, firmSnapshot, biz.id]);
            console.log(`Updated ${resInvoices.rowCount} invoices for business ${biz.id}`);

            // 7. Update dispatch_challans
            const resDispatchChallans = await client.query(`
                UPDATE dispatch_challans 
                SET billing_firm_id = $1, firm_snapshot = $2
                WHERE business_id = $3 AND billing_firm_id IS NULL
            `, [firmId, firmSnapshot, biz.id]);
            console.log(`Updated ${resDispatchChallans.rowCount} dispatch challans for business ${biz.id}`);

            // 8. Update general challans
            const resChallans = await client.query(`
                UPDATE challans 
                SET billing_firm_id = $1, firm_snapshot = $2
                WHERE business_id = $3 AND billing_firm_id IS NULL
            `, [firmId, firmSnapshot, biz.id]);
            console.log(`Updated ${resChallans.rowCount} challans for business ${biz.id}`);
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
