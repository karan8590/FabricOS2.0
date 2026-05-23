import fs from 'fs';
import path from 'path';
import getDatabase from '@/lib/db';

export async function sendTelegramReport(
    filePath: string,
    caption: string,
    isTest: boolean = false,
    notificationType: 'weekly_summary' | 'monthly_summary' = 'weekly_summary'
): Promise<boolean> {
    try {
        const db = getDatabase();
        const tokenRow = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()) as any;
        const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;

        if (!token) {
            console.log('Telegram dispatch skipped: bot token missing.');
            return false;
        }

        // Fetch recipients who have this report type enabled
        let recipients: any[] = [];

        if (isTest) {
            // In test mode, send to all active recipients
            recipients = (await db.prepare(`
                SELECT id, telegram_chat_id 
                FROM telegram_recipients 
                WHERE is_active = 1 AND notifications_enabled = 1
            `).all());
        } else {
            // Production: filter by preference
            recipients = (await db.prepare(`
                SELECT r.id, r.telegram_chat_id 
                FROM telegram_recipients r
                JOIN telegram_notification_preferences p ON r.id = p.recipient_id
                WHERE r.is_active = 1 
                AND r.notifications_enabled = 1
                AND p.${notificationType} = 1
            `).all());
        }

        if (recipients.length === 0) {
            console.log('No recipients configured for report type:', notificationType);
            return false;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });

        const sendPromises = recipients.map(async (recipient: any) => {
            const formData = new FormData();
            formData.append('chat_id', recipient.telegram_chat_id);
            formData.append('document', fileBlob, path.basename(filePath));
            if (caption) {
                formData.append('caption', caption);
                formData.append('parse_mode', 'Markdown');
            }

            const url = `https://api.telegram.org/bot${token}/sendDocument`;
            let deliveryStatus = 'delivered';
            let errorMsg: string | null = null;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errText = await response.text();
                    console.error(`Telegram sendDocument failed for chat ${recipient.telegram_chat_id}: ${errText}`);
                    deliveryStatus = 'failed';
                    errorMsg = errText;
                }
            } catch (err: any) {
                console.error(`Error sending Telegram document to ${recipient.telegram_chat_id}:`, err);
                deliveryStatus = 'failed';
                errorMsg = err.message;
            }

            // Log delivery outcome
            try {
                (await db.prepare(`
                    INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
                    VALUES (?, ?, ?, ?)
                `).run(recipient.id, notificationType, deliveryStatus, errorMsg));
            } catch (e) {}
        });

        await Promise.all(sendPromises);
        return true;
    } catch (error) {
        console.error('Failed to send Telegram report:', error);
        return false;
    }
}
