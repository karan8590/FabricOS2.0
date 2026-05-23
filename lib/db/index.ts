import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const globalForDb = globalThis as unknown as { pool: Pool | null };

let pool: Pool;
if (process.env.NODE_ENV !== 'production') {
    if (!globalForDb.pool) {
        globalForDb.pool = new Pool({
            connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
            max: 20, // max connection pool size
        });
    }
    pool = globalForDb.pool;
} else {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        max: 20,
    });
}

// Automatically run schema on initialization if needed (usually handled by migration scripts in prod)
if (process.env.NODE_ENV !== 'production') {
    try {
        const schema = readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8');
        // Ensure schema executes. In production, use a dedicated migration pipeline.
        pool.query(schema).catch(e => console.error('Schema sync error:', e));
    } catch (e) {
        console.error('Failed to read schema:', e);
    }
}

// Wrapper that perfectly mimics better-sqlite3's .prepare().get()/.all()/.run() structure
function getDatabase() {
    return {
        prepare: (sql: string) => {
            let i = 1;
            // Convert SQLite '?' to Postgres '$1, $2, $3...'
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);

            return {
                get: async (...args: any[]) => {
                    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
                    const { rows } = await pool.query(pgSql, params);
                    return rows[0] || undefined;
                },
                all: async (...args: any[]) => {
                    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
                    const { rows } = await pool.query(pgSql, params);
                    return rows;
                },
                run: async (...args: any[]) => {
                    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
                    // For INSERTs, we automatically append RETURNING id to match better-sqlite3's lastInsertRowid
                    let finalSql = pgSql;
                    if (finalSql.trim().toUpperCase().startsWith('INSERT') && !finalSql.toUpperCase().includes('RETURNING ID')) {
                        finalSql = finalSql.trim().replace(/;$/, '') + ' RETURNING id;';
                    }
                    const res = await pool.query(finalSql, params);
                    return {
                        changes: res.rowCount || 0,
                        lastInsertRowid: (res.rows && res.rows[0] && res.rows[0].id) ? res.rows[0].id : null
                    };
                }
            };
        }
    };
}

export default getDatabase;
export { getDatabase }; // Named export for backward compatibility


