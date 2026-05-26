const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

const businessId = 'business_795468';

async function run() {
    try {
        console.log("=== DB Row Count Verification ===");
        
        const tables = [
            { name: 'workspaces', query: 'SELECT COUNT(*) FROM workspaces WHERE id = $1', args: [businessId] },
            { name: 'firms', query: 'SELECT COUNT(*) FROM firms WHERE workspace_id = $1', args: [businessId] },
            { name: 'customers', query: 'SELECT COUNT(*) FROM customers WHERE business_id = $1', args: [businessId] },
            { name: 'vendors', query: 'SELECT COUNT(*) FROM vendors WHERE business_id = $1', args: [businessId] },
            { name: 'users (employees)', query: 'SELECT COUNT(*) FROM users WHERE business_id = $1', args: [businessId] },
            { name: 'attendance', query: 'SELECT COUNT(*) FROM attendance WHERE business_id = $1', args: [businessId] },
            { name: 'designs', query: 'SELECT COUNT(*) FROM designs WHERE business_id = $1', args: [businessId] },
            { name: 'inventory_materials', query: 'SELECT COUNT(*) FROM inventory_materials WHERE business_id = $1', args: [businessId] },
            { name: 'inventory_history', query: 'SELECT COUNT(*) FROM inventory_history WHERE business_id = $1', args: [businessId] },
            { name: 'orders', query: 'SELECT COUNT(*) FROM orders WHERE business_id = $1', args: [businessId] },
            { name: 'invoices', query: 'SELECT COUNT(*) FROM invoices WHERE business_id = $1', args: [businessId] },
            { name: 'dispatch_batches', query: 'SELECT COUNT(*) FROM dispatch_batches WHERE business_id = $1', args: [businessId] },
            { name: 'dispatch_orders', query: 'SELECT COUNT(*) FROM dispatch_orders WHERE business_id = $1', args: [businessId] },
            { name: 'dispatch_challans', query: 'SELECT COUNT(*) FROM dispatch_challans WHERE business_id = $1', args: [businessId] },
            { name: 'payments', query: 'SELECT COUNT(*) FROM payments WHERE business_id = $1', args: [businessId] },
            { name: 'expenses', query: 'SELECT COUNT(*) FROM expenses WHERE business_id = $1', args: [businessId] }
        ];

        for (const t of tables) {
            const res = await pool.query(t.query, t.args);
            console.log(`${t.name.padEnd(25)}: ${res.rows[0].count}`);
        }

        // Also check if admin user is intact
        const adminRes = await pool.query('SELECT id, name, role, phone FROM users WHERE id = 25');
        if (adminRes.rows.length > 0) {
            console.log("\nAdmin Suresh Shah exists:", adminRes.rows[0]);
        } else {
            console.log("\nWARNING: Admin Suresh Shah is missing!");
        }

        // Validate vendor types mapping
        const vendorTypesRes = await pool.query(
            'SELECT vendor_type, COUNT(*) FROM vendors WHERE business_id = $1 GROUP BY vendor_type',
            [businessId]
        );
        console.log("\nVendor Type Distribution:");
        vendorTypesRes.rows.forEach(r => {
            console.log(`- ${r.vendor_type}: ${r.count}`);
        });

    } catch (err) {
        console.error("Verification failed:", err);
    } finally {
        await pool.end();
    }
}

run();
