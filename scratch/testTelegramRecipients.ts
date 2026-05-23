import getDatabase from '../lib/db';

async function test() {
  const db = getDatabase();
  console.log('Testing Telegram Recipients database tables...');

  // Clear existing
  db.prepare('DELETE FROM telegram_notification_logs').run();
  db.prepare('DELETE FROM telegram_notification_preferences').run();
  db.prepare('DELETE FROM telegram_recipients').run();

  // 1. Insert Recipient
  const insertRecipient = db.prepare(`
    INSERT INTO telegram_recipients (recipient_name, telegram_chat_id, telegram_username, role, notifications_enabled)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = insertRecipient.run('Karan Dhameliya', '9979545340', 'karandhameliya', 'Admin', 1);
  const recipientId = result.lastInsertRowid;
  console.log('Inserted recipient ID:', recipientId);

  // 2. Insert Preferences
  const insertPrefs = db.prepare(`
    INSERT INTO telegram_notification_preferences (
      recipient_id, daily_payments, attendance_reminder, weekly_summary, monthly_summary,
      instant_order_alerts, vendor_alerts, salary_alerts, expense_alerts
    ) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)
  `);
  insertPrefs.run(recipientId);
  console.log('Inserted preferences.');

  // 3. Insert Logs
  const insertLog = db.prepare(`
    INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
    VALUES (?, ?, ?, ?)
  `);
  insertLog.run(recipientId, 'weekly_summary', 'delivered', null);
  insertLog.run(recipientId, 'monthly_summary', 'failed', 'Telegram API Error: Chat not found');
  console.log('Inserted logs.');

  // 4. Query & Verify
  const recipient = db.prepare(`
    SELECT r.*, p.daily_payments, p.weekly_summary, p.monthly_summary
    FROM telegram_recipients r
    JOIN telegram_notification_preferences p ON r.id = p.recipient_id
    WHERE r.id = ?
  `).get(recipientId);
  console.log('Queried Recipient details:', recipient);

  const logs = db.prepare(`
    SELECT * FROM telegram_notification_logs WHERE recipient_id = ?
  `).all(recipientId);
  console.log('Queried Logs:', logs);
}

test().catch(err => {
  console.error('Test failed:', err);
});
