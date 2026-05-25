const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, order_number, dispatch_status, dispatch_type, queued_for_dispatch, dispatch_stage FROM orders WHERE order_number LIKE '2026%'").then(res => {
    console.log(res.rows);
    process.exit(0);
}).catch(console.error);
