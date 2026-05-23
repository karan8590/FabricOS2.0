import { Client } from 'pg';

const connectionString = 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function fixOrdersTable() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to apply missing columns...');
        await client.connect();

        const columns = [
            'ALTER TABLE orders ADD COLUMN order_date INTEGER;',
            'ALTER TABLE orders ADD COLUMN delivery_date INTEGER;',
            "ALTER TABLE orders ADD COLUMN priority TEXT DEFAULT 'normal';",
            'ALTER TABLE orders ADD COLUMN price_per_unit NUMERIC;'
        ];

        for (const sql of columns) {
            try {
                await client.query(sql);
                console.log('Success:', sql);
            } catch (e) {
                console.log('Skipped (already exists?):', sql, e.message);
            }
        }
        
        console.log('Success! Missing columns added.');
    } catch (err) {
        console.error('Error applying missing columns:', err);
    } finally {
        await client.end();
    }
}

fixOrdersTable();
