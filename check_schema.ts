import { pool } from './lib/db/index.js';

async function checkSchema() {
    try {
        const client = await pool.connect();
        
        console.log('--- CUSTOMERS TABLE ---');
        let res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customers';
        `);
        console.table(res.rows);

        console.log('--- ORDERS TABLE ---');
        res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders';
        `);
        console.table(res.rows);

        console.log('--- ALL TABLES ---');
        res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        console.log(res.rows.map(r => r.table_name).join(', '));

        client.release();
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkSchema();
