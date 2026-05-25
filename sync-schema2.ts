import fs from 'fs';
import path from 'path';

const envData = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
envData.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        process.env[match[1]] = match[2];
    }
});

async function run() {
    const { default: getDatabase } = await import('./lib/db/index.ts');
    const db = getDatabase();
    try {
        await db.exec(`
            ALTER TABLE vendor_dispatches ADD COLUMN IF NOT EXISTS telegram_sent INTEGER DEFAULT 0;
        `);
        console.log("Schema applied successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();
