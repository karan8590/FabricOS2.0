import getDatabase from '@/lib/db';

export async function sendTelegramMessage(text: string | { english: string, gujarati: string }, notificationType?: string) {
    try {
        const db = getDatabase();
        const tokenRow = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
        const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;

        if (!token) {
            return false;
        }

        const roleDefaultsMap: Record<string, string> = {};
        const roleRows = await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'role_lang_default_%'").all() as any[];
        roleRows.forEach(row => {
            const roleName = row.key.replace('role_lang_default_', '');
            roleDefaultsMap[roleName] = row.value;
        });

        let recipients: any[] = [];

        if (notificationType) {
            const validTypes = ['daily_payments', 'attendance_reminder', 'weekly_summary', 'monthly_summary', 'instant_order_alerts', 'vendor_alerts', 'salary_alerts', 'expense_alerts'];
            if (validTypes.includes(notificationType)) {
                recipients = await db.prepare(`
                    SELECT r.id, r.telegram_chat_id, r.role, r.preferred_language 
                    FROM telegram_recipients r
                    LEFT JOIN telegram_notification_preferences p ON r.id = p.recipient_id
                    WHERE r.is_active = 1 
                    AND r.notifications_enabled = 1
                    AND COALESCE(p.${notificationType}, 1) = 1
                `).all();
            }
        } else {
            recipients = await db.prepare(`
                SELECT id, telegram_chat_id, role, preferred_language 
                FROM telegram_recipients 
                WHERE is_active = 1 AND notifications_enabled = 1
            `).all();
        }

        if (recipients.length === 0) return false;

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        
        const dispatchPromises = recipients.map(async (recipient: any) => {
            try {
                let messageText = '';
                if (typeof text === 'string') {
                    messageText = text;
                } else {
                    let lang = recipient.preferred_language;
                    if (!lang || lang === 'role_default') {
                        lang = roleDefaultsMap[recipient.role] || 'english';
                    }
                    messageText = lang === 'gujarati' ? (text.gujarati || text.english) : text.english;
                }

                // Inject personalized greeting
                const timeStr = new Date().getHours() < 12 ? (recipient.preferred_language === 'gujarati' ? 'શુભ સવાર' : 'Good Morning') : (recipient.preferred_language === 'gujarati' ? 'નમસ્તે' : 'Hello');
                const nameStr = recipient.recipient_name ? recipient.recipient_name : (recipient.preferred_language === 'gujarati' ? 'મિત્ર' : 'Team Member');
                const greeting = `${timeStr}, ${nameStr} 👋\n\n`;
                
                messageText = greeting + messageText;

                const response = await fetch(telegramUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: recipient.telegram_chat_id,
                        text: messageText,
                        parse_mode: 'Markdown'
                    })
                });

                const status = response.ok ? 'delivered' : 'failed';
                let errorMsg = null;
                if (!response.ok) {
                    errorMsg = await response.text();
                }

                // Log the notification
                await db.prepare(`
                    INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
                    VALUES (?, ?, ?, ?)
                `).run(recipient.id, notificationType || 'general_alert', status, errorMsg);

            } catch (error: any) {
                console.error(`Telegram dispatch error for chat ${recipient.telegram_chat_id}:`, error);
                try {
                    await db.prepare(`
                        INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
                        VALUES (?, ?, 'failed', ?)
                    `).run(recipient.id, notificationType || 'general_alert', error.message);
                } catch(e) {}
            }
        });

        await Promise.all(dispatchPromises);
        return true;
    } catch (e) {
        console.error('sendTelegramMessage failed:', e);
        return false;
    }
}

export async function sendTelegramDocument(
    fileBuffer: Buffer,
    filename: string,
    caption: string | { english: string; gujarati: string },
    notificationType?: string
) {
    try {
        const db = getDatabase();
        const tokenRow = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
        const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;

        if (!token) {
            console.error('No Telegram bot token found in settings or env');
            return false;
        }

        const roleDefaultsMap: Record<string, string> = {};
        const roleRows = await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'role_lang_default_%'").all() as any[];
        roleRows.forEach(row => {
            const roleName = row.key.replace('role_lang_default_', '');
            roleDefaultsMap[roleName] = row.value;
        });

        let recipients: any[] = [];
        if (notificationType) {
            const validTypes = ['daily_payments', 'attendance_reminder', 'weekly_summary', 'monthly_summary', 'instant_order_alerts', 'vendor_alerts', 'salary_alerts', 'expense_alerts'];
            if (validTypes.includes(notificationType)) {
                recipients = await db.prepare(`
                    SELECT r.id, r.telegram_chat_id, r.role, r.preferred_language 
                    FROM telegram_recipients r
                    LEFT JOIN telegram_notification_preferences p ON r.id = p.recipient_id
                    WHERE r.is_active = 1 
                    AND r.notifications_enabled = 1
                    AND COALESCE(p.${notificationType}, 1) = 1
                `).all();
            }
        } else {
            recipients = await db.prepare(`
                SELECT id, telegram_chat_id, role, preferred_language 
                FROM telegram_recipients 
                WHERE is_active = 1 AND notifications_enabled = 1
            `).all();
        }

        if (recipients.length === 0) {
            console.log('No active recipients found for Telegram document dispatch');
            return false;
        }

        const telegramUrl = `https://api.telegram.org/bot${token}/sendDocument`;
        let sentAny = false;

        const dispatchPromises = recipients.map(async (recipient: any) => {
            try {
                let captionText = '';
                if (typeof caption === 'string') {
                    captionText = caption;
                } else {
                    let lang = recipient.preferred_language;
                    if (!lang || lang === 'role_default') {
                        lang = roleDefaultsMap[recipient.role] || 'english';
                    }
                    captionText = lang === 'gujarati' ? (caption.gujarati || caption.english) : caption.english;
                }

                // Create FormData
                const formData = new FormData();
                formData.append('chat_id', recipient.telegram_chat_id);
                formData.append('caption', captionText);
                formData.append('parse_mode', 'Markdown');
                
                // Construct a File-like Blob from the Buffer
                const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
                formData.append('document', blob, filename);

                const response = await fetch(telegramUrl, {
                    method: 'POST',
                    body: formData
                });

                const status = response.ok ? 'delivered' : 'failed';
                let errorMsg = null;
                if (!response.ok) {
                    errorMsg = await response.text();
                } else {
                    sentAny = true;
                }

                // Log the notification
                await db.prepare(`
                    INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
                    VALUES (?, ?, ?, ?)
                `).run(recipient.id, notificationType || 'instant_order_alerts', status, errorMsg);

            } catch (error: any) {
                console.error(`Telegram document dispatch error for chat ${recipient.telegram_chat_id}:`, error);
                try {
                    await db.prepare(`
                        INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
                        VALUES (?, ?, 'failed', ?)
                    `).run(recipient.id, notificationType || 'instant_order_alerts', error.message);
                } catch(e) {}
            }
        });

        await Promise.all(dispatchPromises);
        return sentAny;
    } catch (e) {
        console.error('sendTelegramDocument failed:', e);
        return false;
    }
}

export async function sendMessageToChat(chatId: string | number, text: string) {
    try {
        const db = getDatabase();
        const tokenRow = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
        const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;

        if (!token) {
            return false;
        }

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        return response.ok;
    } catch (e) {
        console.error('sendMessageToChat failed:', e);
        return false;
    }
}
