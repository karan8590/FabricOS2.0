const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const res = await pool.query(`
        SELECT a.employee_id as employeeId, 
               CASE WHEN a.status = 'half_day' THEN 'present' ELSE a.status END as status, 
               a.remarks
        FROM attendance a LIMIT 1
    `);
    console.log("Daily keys:", res.rows[0] ? Object.keys(res.rows[0]) : "no rows");
    
    const sum = await pool.query(`
        SELECT 
            a.employee_id as employeeId,
            SUM(CASE WHEN a.status IN ('present', 'half_day') THEN 1 ELSE 0 END) as presentDays,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentDays
        FROM attendance a GROUP BY a.employee_id LIMIT 1
    `);
    console.log("Monthly keys:", sum.rows[0] ? Object.keys(sum.rows[0]) : "no rows");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
