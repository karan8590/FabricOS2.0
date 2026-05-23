import { Pool } from 'pg';

// ─── Validate required environment variable ───────────────────────────────────
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // Throw a clear error at startup — not a cryptic ECONNREFUSED
    throw new Error(
        '[FabricOS] DATABASE_URL environment variable is not set. ' +
        'Add your Supabase Transaction Pooler URL to Vercel environment variables. ' +
        'Format: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres'
    );
}

// ─── Supabase SSL config ───────────────────────────────────────────────────────
// Supabase requires SSL in production. rejectUnauthorized=false is safe for
// Supabase's self-signed certs on the pooler endpoint.
const sslConfig = process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

// ─── Pool configuration ────────────────────────────────────────────────────────
// Vercel serverless: keep max connections LOW (1-5) to avoid exhausting
// Supabase's connection limit. Supabase Transaction Pooler (port 6543)
// handles multiplexing, so low pool size is correct here.
const poolConfig = {
    connectionString,
    ssl: sslConfig,
    max: process.env.NODE_ENV === 'production' ? 3 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

// ─── Singleton pool (dev) / fresh pool (prod serverless) ─────────────────────
// In development, reuse the pool across hot reloads to avoid too many connections.
// In production (Vercel), each function invocation is isolated anyway.
const globalForDb = globalThis as unknown as { pool: Pool | undefined };

let pool: Pool;

if (process.env.NODE_ENV !== 'production') {
    if (!globalForDb.pool) {
        globalForDb.pool = new Pool(poolConfig);

        // Log connection errors in development
        globalForDb.pool.on('error', (err) => {
            console.error('[DB] Unexpected pool error:', err.message);
        });

        // Auto-run schema sync in development only
        import('fs').then(({ readFileSync }) => {
            import('path').then(({ join }) => {
                try {
                    const schema = readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8');
                    globalForDb.pool?.query(schema).catch(e =>
                        console.error('[DB] Schema sync error:', e.message)
                    );
                } catch (e) {
                    console.error('[DB] Failed to read schema.sql:', e);
                }
            });
        });
    }
    pool = globalForDb.pool;
} else {
    // Production: create a new pool per module load (Vercel serverless isolation)
    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
        console.error('[DB] Pool error in production:', err.message);
    });
}

// ─── Database wrapper ──────────────────────────────────────────────────────────
// Mimics better-sqlite3's .prepare().get()/.all()/.run() API
// but works asynchronously with PostgreSQL.
function getDatabase() {
    return {
        prepare: (sql: string) => {
            let i = 1;
            // Convert SQLite-style '?' placeholders → Postgres '$1, $2, $3...'
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
                    let finalSql = pgSql;

                    // Auto-append RETURNING id for INSERT statements to mimic
                    // better-sqlite3's lastInsertRowid behaviour
                    const isInsert = finalSql.trim().toUpperCase().startsWith('INSERT');
                    const hasReturning = finalSql.toUpperCase().includes('RETURNING');
                    const isSettingsTable = /INTO\s+settings\b/i.test(finalSql);

                    if (isInsert && !hasReturning) {
                        if (isSettingsTable) {
                            finalSql = finalSql.trim().replace(/;$/, '') + ' RETURNING key;';
                        } else {
                            finalSql = finalSql.trim().replace(/;$/, '') + ' RETURNING id;';
                        }
                    }

                    const res = await pool.query(finalSql, params);
                    return {
                        changes: res.rowCount || 0,
                        lastInsertRowid: (res.rows && res.rows[0] && res.rows[0].id)
                            ? res.rows[0].id
                            : null,
                    };
                },
            };
        },

        // Direct query access for advanced use cases
        query: (sql: string, params?: any[]) => pool.query(sql, params),
    };
}

export default getDatabase;
export { getDatabase, pool };
