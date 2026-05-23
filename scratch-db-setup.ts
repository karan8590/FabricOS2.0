import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const connectionString = 'postgresql://postgres:zaxvo1-vunxic-tiDtyz@db.smybdgzxpbiffjhwghor.supabase.co:5432/postgres';

async function setupDatabase() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Supabase...');
        await client.connect();
        console.log('Connected successfully!');

        // Check if users table exists
        const res = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);

        if (!res.rows[0].exists) {
            console.log('Tables not found. Running schema.sql...');
            const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
            const schema = readFileSync(schemaPath, 'utf8');
            await client.query(schema);
            console.log('Schema applied successfully!');
        } else {
            console.log('Tables already exist. Skipping schema apply.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

setupDatabase();
