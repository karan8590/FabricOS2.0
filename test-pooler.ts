import { Client } from 'pg';

const connectionString = 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function test() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Testing connection to pooler...');
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log('Success! Connected via pooler. Time:', res.rows[0]);
    } catch (err) {
        console.error('Failed to connect:', err.message);
    } finally {
        await client.end();
    }
}

test();
