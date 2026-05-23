import getDatabase from '@/lib/db';

export type NotificationType = 
    | 'new_order' 
    | 'invoice_overdue' 
    | 'payment_received' 
    | 'salary_pending' 
    | 'order_completed'
    | 'order_created' 
    | 'order_approved';

interface NotificationPayload {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    meta?: any;
}

export class NotificationService {
    static async send({ userId, type, title, message, meta }: NotificationPayload) {
        try {
            const db = getDatabase();
            const createdAt = Math.floor(Date.now() / 1000);

            // 1. Strict Duplicate Prevention (Safety First)
            const duplicate = (await db.prepare(`
                SELECT id FROM notifications 
                WHERE user_id = ? AND type = ? AND title = ? AND message = ?
            `).get(userId, type, title, message));

            if (duplicate) {
                return; // Skip duplicate alert creation
            }

            // 2. Insert new notification
            const result = (await db.prepare(`
                INSERT INTO notifications (user_id, type, title, message, is_read, created_at, meta, push_sent, push_sent_at)
                VALUES (?, ?, ?, ?, 0, ?, ?, 0, NULL)
            `).run(userId, type, title, message, createdAt, JSON.stringify(meta || {})));

            console.log(`[Notification] Sent to User ${userId} (${type}): ${title}`);

            // 3. Browser Push Notification / FCM Integration
            const userPref = (await db.prepare('SELECT fcm_token, push_notifications_enabled FROM users WHERE id = ?').get(userId)) as any;

            if (userPref && userPref.push_notifications_enabled === 1 && userPref.fcm_token) {
                const oneDayAgo = createdAt - (24 * 60 * 60);
                
                // Duplicate Push Prevention: Only push if no identical push sent to this user in the last 24 hours
                const recentPush = (await db.prepare(`
                    SELECT id FROM notifications 
                    WHERE user_id = ? AND type = ? AND push_sent = 1 AND created_at > ?
                `).get(userId, type, oneDayAgo));

                if (!recentPush) {
                    console.log(`[FCM Push Server] Dispatching FCM message payload to token: ${userPref.fcm_token}`);
                    console.log(`[FCM Push Server] Payload: { Title: "${title}", Body: "${message}" }`);
                    
                    // Mark push notification as sent in SQLite
                    (await db.prepare(`
                        UPDATE notifications 
                        SET push_sent = 1, push_sent_at = ? 
                        WHERE id = ?
                    `).run(createdAt, result.lastInsertRowid));
                } else {
                    console.log(`[FCM Push Server] Duplication check triggered: Skip push to User ${userId} (already sent in last 24h).`);
                }
            }
        } catch (error) {
            console.error('[Notification] Error sending notification:', error);
        }
    }

    static async sendWhatsApp(phone: string, templateKey: string, data: any) {
        // Stub for WhatsApp integration
        console.log(`[WhatsApp] Sending to ${phone} | Template: ${templateKey}`);
        console.log(`[WhatsApp] Data:`, data);
        return true;
    }

    static async markAsRead(notificationId: number, userId: number) {
        const db = getDatabase();
        const result = (await db.prepare(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ? AND user_id = ?
        `).run(notificationId, userId));

        return result.changes > 0;
    }

    static async markAllAsRead(userId: number) {
        const db = getDatabase();
        (await db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(userId));
    }

    /**
     * Automatically scan for invoices that have gone overdue (unpaid beyond 30 days or due date passed)
     * and trigger notifications for all administrative roles.
     */
    static async checkAndCreateOverdueNotifications() {
        try {
            const db = getDatabase();
            const now = Math.floor(Date.now() / 1000);
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

            // Find invoices that are unpaid or partial and exceed the grace period
            const overdueInvoices = (await db.prepare(`
                SELECT * FROM invoices 
                WHERE status IN ('unpaid', 'partial') 
                  AND (due_date < ? OR generated_at < ?)
            `).all(now, thirtyDaysAgo)) as any[];

            if (overdueInvoices.length === 0) return;

            const admins = (await db.prepare("SELECT id, business_id FROM users WHERE role IN ('admin', 'manager')").all()) as any[];

            for (const invoice of overdueInvoices) {
                const businessAdmins = admins.filter(a => a.business_id === invoice.business_id);
                for (const admin of businessAdmins) {
                    await this.send({
                        userId: admin.id,
                        type: 'invoice_overdue',
                        title: 'Invoice Overdue',
                        message: `Invoice #${invoice.invoice_number} is overdue today.`,
                        meta: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }
                    });
                }
            }
        } catch (error) {
            console.error('[NotificationService] checkAndCreateOverdueNotifications error:', error);
        }
    }

    /**
     * Automatically scan for salary worksheets that are in unpaid status
     * and trigger alerts for all administrative roles.
     */
    static async checkAndCreateSalaryNotifications() {
        try {
            const db = getDatabase();
            
            // Find all unpaid salaries
            const unpaidSalaries = (await db.prepare(`
                SELECT salaries.*, users.name as employee_name 
                FROM salaries 
                JOIN users ON salaries.employee_id = users.id
                WHERE salaries.status = 'unpaid'
            `).all()) as any[];

            if (unpaidSalaries.length === 0) return;

            const admins = (await db.prepare("SELECT id, business_id FROM users WHERE role IN ('admin', 'manager')").all()) as any[];

            for (const salary of unpaidSalaries) {
                const businessAdmins = admins.filter(a => a.business_id === salary.business_id);
                for (const admin of businessAdmins) {
                    await this.send({
                        userId: admin.id,
                        type: 'salary_pending',
                        title: 'Salary Payment Pending',
                        message: `Salary for ${salary.employee_name} (Month: ${salary.month}) is pending payment.`,
                        meta: { salaryId: salary.id, employeeId: salary.employee_id, month: salary.month }
                    });
                }
            }
        } catch (error) {
            console.error('[NotificationService] checkAndCreateSalaryNotifications error:', error);
        }
    }
}
