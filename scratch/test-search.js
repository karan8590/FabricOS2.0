const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

const businessId = 'business_795468';
const query = 'GJ05';
const searchTerm = `%${query}%`;

async function run() {
    try {
        console.log("=== Testing Database Search Queries ===");
        
        // Helper to run query
        const runQuery = async (name, sql, params) => {
            console.log(`Running search on [${name}] with query "${query}"...`);
            // Convert ? to $1, $2 for Postgres
            let i = 1;
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);
            const res = await pool.query(pgSql, params);
            console.log(`Found ${res.rows.length} rows:`, res.rows);
            console.log("-----------------------------------------");
            return res.rows;
        };

        await runQuery("Orders", `
            SELECT o.id, o.order_number, o.status, o.order_stage, o.quantity_meters, o.total_price,
                   c.name as customer_name, d.name as design_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN designs d ON o.design_id = d.id
            WHERE o.business_id = ? AND (
                o.order_number ILIKE ? OR
                c.name ILIKE ? OR
                d.name ILIKE ? OR
                c.phone ILIKE ?
            )
            ORDER BY o.id DESC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm, searchTerm]);

        await runQuery("Customers", `
            SELECT id, name, phone, gstin, state, outstanding_amount
            FROM customers
            WHERE business_id = ? AND (
                name ILIKE ? OR
                phone ILIKE ? OR
                gstin ILIKE ?
            )
            ORDER BY name ASC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm]);

        await runQuery("Vendors", `
            SELECT id, name, contact as phone, vendor_type, balance, city
            FROM vendors
            WHERE business_id = ? AND (
                name ILIKE ? OR
                vendor_type ILIKE ? OR
                contact ILIKE ?
            )
            ORDER BY name ASC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm]);

        await runQuery("Invoices", `
            SELECT i.id, i.invoice_number, i.amount, i.status, i.amount_paid,
                   c.name as customer_name
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.business_id = ? AND (
                i.invoice_number ILIKE ? OR
                c.name ILIKE ? OR
                c.gstin ILIKE ?
            )
            ORDER BY i.id DESC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm]);

        await runQuery("Challans", `
            SELECT id, challan_number, challan_type, transporter, vehicle_number, date, status
            FROM challans
            WHERE business_id = ? AND (
                challan_number ILIKE ? OR
                transporter ILIKE ? OR
                vehicle_number ILIKE ?
            )
            ORDER BY id DESC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm]);

        await runQuery("Dispatch Challans", `
            SELECT dc.id, dc.challan_number, db.vehicle_number, v.name as transporter, dc.created_at
            FROM dispatch_challans dc
            JOIN dispatch_batches db ON dc.dispatch_id = db.id
            LEFT JOIN vendors v ON db.transport_vendor_id = v.id
            WHERE dc.business_id = ? AND (
                dc.challan_number ILIKE ? OR
                v.name ILIKE ? OR
                db.vehicle_number ILIKE ?
            )
            ORDER BY dc.id DESC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm]);

        await runQuery("Employees", `
            SELECT id, name, phone, role, is_active
            FROM users
            WHERE business_id = ? AND role != 'customer' AND (
                name ILIKE ? OR
                phone ILIKE ? OR
                role ILIKE ?
            )
            ORDER BY name ASC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm]);

        await runQuery("Catalog", `
            SELECT id, name, category, price_per_meter, available
            FROM designs
            WHERE business_id = ? AND (
                name ILIKE ? OR
                category ILIKE ?
            )
            ORDER BY name ASC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm]);

        await runQuery("Dispatches", `
            SELECT db.id, db.dispatch_number, db.vehicle_number, db.driver_name, db.route, db.status,
                   v.name as transport_vendor
            FROM dispatch_batches db
            LEFT JOIN vendors v ON db.transport_vendor_id = v.id
            WHERE db.business_id = ? AND (
                db.dispatch_number ILIKE ? OR
                db.vehicle_number ILIKE ? OR
                db.route ILIKE ? OR
                v.name ILIKE ?
            )
            ORDER BY db.id DESC
            LIMIT 6
        `, [businessId, searchTerm, searchTerm, searchTerm, searchTerm]);

        console.log("=== DB Queries execution successful! ===");
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
