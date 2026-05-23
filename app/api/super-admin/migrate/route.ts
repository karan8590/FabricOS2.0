import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== 'run_migration_now') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    try {
        db.exec('BEGIN TRANSACTION');

        // 1. Create first business (business_001)
        const insertBusiness = db.prepare(`
            INSERT OR IGNORE INTO businesses (id, name, type, status, uses_shared_catalog, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        insertBusiness.run('business_001', 'FabricOS Primary Business', 'fabric_manufacturing', 'active', 0, Math.floor(Date.now() / 1000));

        // 2. Set all existing records in all tables to business_001
        const tablesToUpdate = [
            'users', 'customers', 'designs', 'orders', 'invoices', 'expenses',
            'vendors', 'payments', 'activity', 'attendance', 'advances', 'salaries',
            'employee_advances', 'advance_instalments', 'inventory_fabric',
            'inventory_ink', 'inventory_packaging', 'settings', 'whatsapp_reminders',
            'reminder_logs', 'order_job_costs', 'vendor_payments', 'vendor_payment_instalments',
            'notifications'
        ];

        let updatedCount = 0;
        for (const table of tablesToUpdate) {
            try {
                const info = (await db.prepare(`UPDATE ${table} SET business_id = 'business_001' WHERE business_id IS NULL`).run());
                updatedCount += info.changes;
            } catch (e) {
                console.error(`Failed to update ${table}:`, e);
            }
        }

        // 3. Create a Super Admin account (Optional: we can just convert user ID 1 or create a new one)
        // Check if super admin exists
        const existingSuperAdmin = (await db.prepare('SELECT id FROM super_admins LIMIT 1').get());
        if (!existingSuperAdmin) {
            // Find the first admin user and convert their credentials to super admin
            const firstAdmin = (await db.prepare(`SELECT email, name, password_hash FROM users WHERE role = 'admin' LIMIT 1`).get()) as any;
            if (firstAdmin) {
                (await db.prepare(`
                    INSERT INTO super_admins (email, name, password_hash, created_at)
                    VALUES (?, ?, ?, ?)
                `).run(firstAdmin.email || 'superadmin@example.com', firstAdmin.name, firstAdmin.password_hash, Math.floor(Date.now() / 1000)));
            }
        }

        db.exec('COMMIT');

        return NextResponse.json({
            success: true,
            message: `Migration completed successfully. Updated ${updatedCount} records to business_001.`
        });
    } catch (error: any) {
        db.exec('ROLLBACK');
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 });
    }
}
