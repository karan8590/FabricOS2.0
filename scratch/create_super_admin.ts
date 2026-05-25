import getDatabase from '../lib/db';
import { hashPassword } from '../lib/auth/password';

async function run() {
    const db = getDatabase();
    const loginId = '9979545340';
    const plainTextPassword = '123456';
    const name = 'Super Admin';

    try {
        const hashedPassword = await hashPassword(plainTextPassword);
        await db.prepare('INSERT INTO super_admins (email, password_hash, name) VALUES (?, ?, ?)').run(loginId, hashedPassword, name);
        console.log(`Successfully created super admin with ID: ${loginId}`);
    } catch (err: any) {
        if (err.message.includes('UNIQUE') || err.message.includes('unique constraint')) {
            console.log(`Super admin ${loginId} already exists!`);
        } else {
            console.error('Error inserting:', err);
        }
    }
}
run();
