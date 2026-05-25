const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Adding columns to vendors table...");
        const queries = [
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS alt_phone TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rate_type TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS upi_id TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_number TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ifsc_code TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT",
            "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'"
        ];

        for (const q of queries) {
            await pool.query(q);
            console.log("Executed:", q);
        }
        console.log("Migration successful.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

run();
