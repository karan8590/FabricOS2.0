import getDatabase from '../lib/db';
async function run() {
    const db = getDatabase();
    const user = await db.prepare('SELECT * FROM users WHERE phone = ?').get('9979545340');
    if (!user) {
        console.log('User not found');
        return;
    }
    console.log('Found user:', user.name);
    // Insert into super_admins
    try {
        await db.prepare('INSERT INTO super_admins (email, password_hash, name) VALUES (?, ?, ?)').run('9979545340', user.password_hash, user.name);
        console.log('Added to super_admins!');
    } catch (err: any) {
        if (err.message.includes('UNIQUE') || err.message.includes('unique constraint')) {
            console.log('Already a super admin');
        } else {
            console.error('Error inserting:', err);
        }
    }
}
run();
