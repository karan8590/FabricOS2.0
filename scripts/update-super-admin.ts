import { hashPassword } from '../lib/auth/password';
import { getDatabase } from '../lib/db';

async function update() {
    const db = getDatabase();
    const hash = await hashPassword('123456');
    
    // Check if super admin exists
    const admin = db.prepare('SELECT * FROM super_admins LIMIT 1').get() as any;
    
    if (admin) {
        db.prepare('UPDATE super_admins SET email = ?, password_hash = ? WHERE id = ?').run('9979545340', hash, admin.id);
        console.log('Updated existing super admin credentials');
    } else {
        db.prepare('INSERT INTO super_admins (email, password_hash, name) VALUES (?, ?, ?)').run('9979545340', hash, 'Super Admin User');
        console.log('Created new super admin');
    }
}

update().catch(console.error);
