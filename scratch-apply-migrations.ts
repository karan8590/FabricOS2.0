import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const migrations = [
        `CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          meta TEXT,
          push_sent INTEGER DEFAULT 0,
          push_sent_at INTEGER
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_connections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          telegram_chat_id TEXT,
          telegram_username TEXT,
          telegram_first_name TEXT,
          token TEXT UNIQUE,
          token_expiry INTEGER,
          connected_at INTEGER,
          is_active INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))
        );`,
        `ALTER TABLE salaries ADD COLUMN payment_method TEXT;`,
        `ALTER TABLE salaries ADD COLUMN reference_number TEXT;`,
        `ALTER TABLE salaries ADD COLUMN payment_date TEXT;`,
        `ALTER TABLE expenses ADD COLUMN description TEXT;`,
        `ALTER TABLE expenses ADD COLUMN paymentMode TEXT;`,
        `ALTER TABLE expenses ADD COLUMN reference TEXT;`,
        `ALTER TABLE expenses ADD COLUMN addedBy INTEGER;`,
        `ALTER TABLE expenses ADD COLUMN isAuto INTEGER DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN linkedId TEXT;`,
        `ALTER TABLE users ADD COLUMN fcm_token TEXT;`,
        `ALTER TABLE users ADD COLUMN push_notifications_enabled INTEGER DEFAULT 0;`,
        `ALTER TABLE notifications ADD COLUMN push_sent INTEGER DEFAULT 0;`,
        `ALTER TABLE notifications ADD COLUMN push_sent_at INTEGER;`,
        `ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'out';`,
        `ALTER TABLE expenses ADD COLUMN customerName TEXT;`,
        `ALTER TABLE vendors ADD COLUMN vendor_type TEXT DEFAULT 'Fabric Supplier';`,
        `ALTER TABLE orders ADD COLUMN embroidery_job_cost REAL DEFAULT 0;`,
        `ALTER TABLE orders ADD COLUMN dyeing_job_cost REAL DEFAULT 0;`,
        `CREATE TABLE IF NOT EXISTS order_job_costs (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('embroidery', 'dyeing')),
          vendor_id INTEGER NOT NULL,
          metres REAL NOT NULL,
          rate_per_metre REAL NOT NULL,
          total_cost REAL NOT NULL,
          date TEXT NOT NULL,
          payment_mode TEXT NOT NULL,
          reference TEXT,
          status TEXT NOT NULL CHECK(status IN ('paid', 'unpaid')),
          notes TEXT,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
        );`,
        `CREATE TABLE IF NOT EXISTS vendor_payments (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          vendor_phone TEXT NOT NULL,
          order_id INTEGER,
          order_number TEXT,
          work_type TEXT NOT NULL CHECK(work_type IN ('embroidery', 'dyeing')),
          total_amount REAL NOT NULL,
          amount_paid REAL NOT NULL DEFAULT 0,
          balance REAL NOT NULL,
          due_date TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('paid', 'partial', 'unpaid', 'overdue')) DEFAULT 'unpaid',
          notes TEXT,
          linked_job_cost_id INTEGER,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS vendor_payment_instalments (
          id SERIAL PRIMARY KEY,
          vendor_payment_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_mode TEXT NOT NULL,
          reference TEXT,
          notes TEXT,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          FOREIGN KEY (vendor_payment_id) REFERENCES vendor_payments(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS whatsapp_reminders (
          id SERIAL PRIMARY KEY,
          date TEXT NOT NULL,
          vendor_payment_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          UNIQUE(date, vendor_payment_id)
        );`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );`,
        `ALTER TABLE vendor_payments ADD COLUMN notes TEXT;`,
        `CREATE TABLE IF NOT EXISTS reminder_logs (
          id SERIAL PRIMARY KEY,
          sent_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          due_today_count INTEGER NOT NULL,
          overdue_count INTEGER NOT NULL,
          total_due_today REAL NOT NULL,
          total_overdue REAL NOT NULL,
          callmebot_status INTEGER
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_recipients (
          id SERIAL PRIMARY KEY,
          recipient_name TEXT NOT NULL,
          telegram_chat_id TEXT NOT NULL UNIQUE,
          telegram_username TEXT,
          role TEXT DEFAULT 'Staff',
          notifications_enabled INTEGER DEFAULT 1,
          is_active INTEGER DEFAULT 1,
          connected_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          last_notification_sent_at INTEGER,
          preferred_language TEXT DEFAULT 'role_default',
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_notification_preferences (
          recipient_id INTEGER PRIMARY KEY,
          daily_payments INTEGER DEFAULT 1,
          attendance_reminder INTEGER DEFAULT 1,
          weekly_summary INTEGER DEFAULT 1,
          monthly_summary INTEGER DEFAULT 1,
          instant_order_alerts INTEGER DEFAULT 1,
          vendor_alerts INTEGER DEFAULT 1,
          salary_alerts INTEGER DEFAULT 1,
          expense_alerts INTEGER DEFAULT 1,
          FOREIGN KEY (recipient_id) REFERENCES telegram_recipients(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS telegram_notification_logs (
          id SERIAL PRIMARY KEY,
          recipient_id INTEGER NOT NULL,
          notification_type TEXT NOT NULL,
          delivery_status TEXT NOT NULL CHECK(delivery_status IN ('delivered', 'failed', 'pending')),
          error_message TEXT,
          sent_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
          FOREIGN KEY (recipient_id) REFERENCES telegram_recipients(id) ON DELETE CASCADE
        );`,
        `ALTER TABLE telegram_recipients ADD COLUMN preferred_language TEXT DEFAULT 'role_default';`,
        `INSERT INTO telegram_notification_preferences (
            recipient_id, daily_payments, attendance_reminder, weekly_summary,
            monthly_summary, instant_order_alerts, vendor_alerts, salary_alerts, expense_alerts
        ) SELECT id, 1, 1, 1, 1, 1, 1, 1, 1 FROM telegram_recipients ON CONFLICT DO NOTHING;`,
        `ALTER TABLE invoices ADD COLUMN pdf_url TEXT;`,
        `ALTER TABLE invoices ADD COLUMN telegram_delivered INTEGER DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN telegram_sent_at INTEGER;`,
        `ALTER TABLE expenses ADD COLUMN isPending INTEGER DEFAULT 0;`,
        `ALTER TABLE customers ADD COLUMN gstin TEXT;`,
        `ALTER TABLE customers ADD COLUMN state TEXT;`,
        `ALTER TABLE customers ADD COLUMN state_code TEXT;`,
        `ALTER TABLE customers ADD COLUMN customer_type TEXT DEFAULT 'B2C';`,
        `ALTER TABLE vendors ADD COLUMN state TEXT;`,
        `ALTER TABLE vendors ADD COLUMN state_code TEXT;`,
        `ALTER TABLE invoices ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN cgst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN sgst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN igst_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN hsn_code TEXT;`,
        `ALTER TABLE invoices ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE invoices ADD COLUMN place_of_supply TEXT;`,
        `ALTER TABLE invoices ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `ALTER TABLE expenses ADD COLUMN has_gst INTEGER DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN supplier_gstin TEXT;`,
        `ALTER TABLE expenses ADD COLUMN invoice_no TEXT;`,
        `ALTER TABLE expenses ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE expenses ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `ALTER TABLE expenses ADD COLUMN itc_claimed INTEGER DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN has_gst INTEGER DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE order_job_costs ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `ALTER TABLE vendor_payments ADD COLUMN has_gst INTEGER DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN gst_rate REAL DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN gst_amount REAL DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN taxable_amount REAL DEFAULT 0;`,
        `ALTER TABLE vendor_payments ADD COLUMN gst_type TEXT DEFAULT 'NONE';`,
        `CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          owner_uid INTEGER,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
          uses_shared_catalog INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))
        );`,
        `CREATE TABLE IF NOT EXISTS super_admins (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))
        );`,
        `ALTER TABLE users ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE customers ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE designs ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE orders ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE invoices ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE expenses ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE vendors ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE payments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE activity ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE attendance ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE advances ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE salaries ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE employee_advances ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE advance_instalments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE inventory_fabric ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE inventory_ink ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE inventory_packaging ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE settings ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE whatsapp_reminders ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE reminder_logs ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE order_job_costs ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE vendor_payments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE vendor_payment_instalments ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE notifications ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE telegram_connections ADD COLUMN business_id TEXT DEFAULT 'business_001';`,
        `ALTER TABLE designs ADD COLUMN stock_quantity REAL DEFAULT 100;`
];

async function runAllMigrations() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to apply all migrations...');
        await client.connect();

        for (const sql of migrations) {
            try {
                await client.query(sql);
                console.log('Success:', sql.split('\\n')[0]);
            } catch (e) {
                console.log('Skipped:', sql.split('\\n')[0], e.message);
            }
        }
        
        console.log('Success! All migrations processed.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

runAllMigrations();
