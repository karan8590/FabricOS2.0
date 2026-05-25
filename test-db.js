const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('ALTER TABLE inventory_fabric ADD COLUMN IF NOT EXISTS fabric_type TEXT').then(res => { console.log('Added fabric_type'); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });
