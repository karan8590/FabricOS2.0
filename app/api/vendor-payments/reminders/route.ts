import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';

// Helper to check authentication
async function getAuthenticatedUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;
        return verifyToken(token);
    } catch {
        return null;
    }
}

export async function POST() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDatabase();

        // 1. Fetch settings
        const rows = (await db.prepare(`
            SELECT * FROM settings 
            WHERE key IN ('admin_whatsapp', 'callmebot_api_key', 'reminders_enabled')
        `).all()) as any[];

        const settingsMap: Record<string, string> = {};
        rows.forEach((r) => {
            settingsMap[r.key] = r.value;
        });

        const adminWhatsapp = settingsMap['admin_whatsapp'] || '';
        const apiKey = settingsMap['callmebot_api_key'] || '';
        const enabled = settingsMap['reminders_enabled'] || 'off';

        if (enabled !== 'on' || !adminWhatsapp || !apiKey) {
            return NextResponse.json({ success: true, message: 'Reminders disabled or configuration missing' });
        }

        // 2. Fetch all unpaid/partial payments
        const payments = (await db.prepare(`
            SELECT * FROM vendor_payments 
            WHERE status != 'paid'
        `).all()) as any[];

        // 3. Define date boundaries matching conditions
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const threeDaysStr = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

        let sentCount = 0;

        for (const payment of payments) {
            // Check if reminder was already recorded today for this payment
            const existing = (await db.prepare(`
                SELECT id FROM whatsapp_reminders 
                WHERE date = ? AND vendor_payment_id = ?
            `).get(todayStr, payment.id));

            if (existing) continue;

            let msg = '';
            const orderNo = payment.order_number || payment.order_id || 'manual';

            if (payment.due_date === threeDaysStr) {
                msg = `FabricOS Reminder: ₹${payment.balance} payment due to ${payment.vendor_name} for ${payment.work_type} (Order ${orderNo}) in 3 days on ${payment.due_date}.`;
            } else if (payment.due_date === tomorrowStr) {
                msg = `FabricOS Reminder: ₹${payment.balance} payment due TOMORROW to ${payment.vendor_name} for ${payment.work_type} (Order ${orderNo}).`;
            } else if (payment.due_date === yesterdayStr) {
                msg = `FabricOS Alert: Payment of ₹${payment.balance} to ${payment.vendor_name} for ${payment.work_type} (Order ${orderNo}) is OVERDUE since ${payment.due_date}. Please pay immediately.`;
            }

            if (msg) {
                // Fire CallMeBot API request
                try {
                    const botUrl = `https://api.callmebot.com/whatsapp.php?phone=${adminWhatsapp}&text=${encodeURIComponent(msg)}&apikey=${apiKey}`;
                    const res = await fetch(botUrl);
                    
                    if (res.ok) {
                        // Insert record into whatsapp_reminders
                        (await db.prepare(`
                            INSERT INTO whatsapp_reminders (date, vendor_payment_id) 
                            VALUES (?, ?)
                        `).run(todayStr, payment.id));
                        sentCount++;
                    } else {
                        console.error('CallMeBot delivery error status:', res.status);
                    }
                } catch (fetchErr) {
                    console.error('CallMeBot dispatch exception:', fetchErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            sentReminders: sentCount
        });
    } catch (error) {
        console.error('Process whatsapp reminders error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
