const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Creating database indexes for Global Search...");
        
        await pool.query("CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)");
        console.log("- idx_customers_name created/verified");
        
        await pool.query("CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin)");
        console.log("- idx_customers_gstin created/verified");
        
        await pool.query("CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)");
        console.log("- idx_vendors_name created/verified");
        
        await pool.query("CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type)");
        console.log("- idx_vendors_type created/verified");
        
        await pool.query("CREATE INDEX IF NOT EXISTS idx_designs_name ON designs(name)");
        console.log("- idx_designs_name created/verified");
        
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)");
        console.log("- idx_users_name created/verified");

        console.log("All indexes verified successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to create indexes:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
