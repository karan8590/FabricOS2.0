import { Client } from 'pg';
import { hashPassword } from './lib/auth/password.js';

const connectionString = 'postgresql://postgres:zaxvo1-vunxic-tiDtyz@db.smybdgzxpbiffjhwghor.supabase.co:5432/postgres';

async function seed() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting...');
        await client.connect();

        console.log('Hashing passwords...');
        const adminHash = await hashPassword('admin123');
        const staffHash = await hashPassword('staff123');
        const customerHash = await hashPassword('customer123');

        console.log('Inserting default users...');
        await client.query(`
            INSERT INTO users (phone, password_hash, name, role, is_active, can_login, business_id)
            VALUES 
            ('+919999999999', $1, 'Demo Admin', 'admin', 1, 1, 'business_001'),
            ('+919999999998', $2, 'Demo Staff', 'staff', 1, 1, 'business_001'),
            ('+919999999991', $3, 'Demo Customer', 'customer', 1, 1, 'business_001')
            ON CONFLICT (phone) DO NOTHING;
        `, [adminHash, staffHash, customerHash]);

        console.log('Inserting default customer record...');
        // get the user id for customer
        const res = await client.query(`SELECT id FROM users WHERE phone = '+919999999991'`);
        if (res.rows.length > 0) {
            const userId = res.rows[0].id;
            await client.query(`
                INSERT INTO customers (user_id, name, phone, customer_type, business_id)
                VALUES ($1, 'Demo Customer', '+919999999991', 'B2B', 'business_001')
                ON CONFLICT (phone) DO NOTHING;
            `, [userId]);
        }

        console.log('Seed completed successfully!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

seed();
