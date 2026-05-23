import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth/jwt';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildDailySummaryTemplate } from '@/lib/telegram-templates';

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

export async function GET(request: Request) {
    try {
        const db = getDatabase();
        const { searchParams } = new URL(request.url);
        const isTest = searchParams.get('test') === 'true';

        // Check if reminders are enabled (unless it is a test run)
        const remindersEnabledRow = (await db.prepare("SELECT value FROM settings WHERE key = 'reminders_enabled'").get()) as any;
        const remindersEnabled = remindersEnabledRow?.value === 'on';

        if (!remindersEnabled && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Reminders disabled' });
        }

        const notifyDailyRow = (await db.prepare("SELECT value FROM settings WHERE key = 'notify_daily_reminder'").get()) as any;
        const notifyDaily = (notifyDailyRow?.value ?? 'on') === 'on';

        if (!notifyDaily && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Daily payments reminder is turned off' });
        }

        // Verify authorization: either Cron Secret or logged-in admin
        const authHeader = request.headers.get('authorization');
        const hasCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

        let authorized = hasCronSecret;
        if (!authorized) {
            const user = await getAuthenticatedUser();
            if (user && user.role === 'admin') {
                authorized = true;
            }
        }

        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const offsetIST = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(Date.now() + offsetIST);
        const todayTimestamp = Math.floor(new Date(Date.UTC(todayIST.getUTCFullYear(), todayIST.getUTCMonth(), todayIST.getUTCDate())).getTime() / 1000);
        const nextDayTimestamp = todayTimestamp + 86400;
        
        // Ensure todayStr is based on local IST date
        const yyyy = todayIST.getUTCFullYear();
        const mm = String(todayIST.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(todayIST.getUTCDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // --- FETCH RECEIVABLES ---
        // Fetch top 5 pending invoices (receivables) strictly due today
        const receivablesQuery = (await db.prepare(`
            SELECT 
                i.invoice_number, 
                c.name as customer_name, 
                (i.amount - COALESCE(i.amount_paid, 0)) as pending_amount
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.status IN ('unpaid', 'partial')
            AND i.due_date >= ? AND i.due_date < ?
            ORDER BY i.due_date ASC
            LIMIT 5
        `).all(todayTimestamp, nextDayTimestamp)) as any[];

        const receivables = receivablesQuery.map(row => {
            return {
                customerName: row.customer_name,
                orderNumber: row.invoice_number,
                pendingAmount: row.pending_amount
            };
        });

        const totalReceivableRow = (await db.prepare(`
            SELECT SUM(amount - COALESCE(amount_paid, 0)) as total
            FROM invoices
            WHERE status IN ('unpaid', 'partial')
            AND due_date >= ? AND due_date < ?
        `).get(todayTimestamp, nextDayTimestamp)) as any;
        const totalReceivable = totalReceivableRow?.total || 0;

        // --- FETCH PAYABLES ---
        // Fetch top 5 pending vendor payments strictly due today
        const payablesQuery = (await db.prepare(`
            SELECT 
                vp.vendor_name,
                vp.work_type,
                (vp.total_amount - COALESCE(vp.amount_paid, 0)) as pending_amount
            FROM vendor_payments vp
            WHERE vp.status IN ('unpaid', 'partial')
            AND vp.due_date = ?
            ORDER BY vp.id ASC
            LIMIT 5
        `).all(todayStr)) as any[];

        const payables = payablesQuery.map(row => {
            const displayType = row.work_type === 'embroidery' ? 'Embroidery' : 'Dyeing';
            
            return {
                vendorName: row.vendor_name,
                jobType: displayType,
                pendingAmount: row.pending_amount
            };
        });

        const totalPayableRow = (await db.prepare(`
            SELECT SUM(total_amount - COALESCE(amount_paid, 0)) as total
            FROM vendor_payments
            WHERE status IN ('unpaid', 'partial')
            AND due_date = ?
        `).get(todayStr)) as any;
        const totalPayable = totalPayableRow?.total || 0;

        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = todayIST.toLocaleDateString('en-IN', dateOptions);

        const templateData = {
            dateStr: formattedDate,
            receivables,
            payables,
            totalReceivable,
            totalPayable
        };

        const payload = buildDailySummaryTemplate(templateData);

        // --- SEND VIA TELEGRAM BOT ---
        const telegramSent = await sendTelegramMessage(payload, 'daily_payments');
        
        if (!telegramSent) {
            console.error('Telegram dispatch failed or no recipients configured');
        }

        // --- FETCH INVENTORY LOW STOCK ALERTS ---
        const lowStockInk = (await db.prepare(`SELECT ink_colour, current_balance, unit, min_stock FROM inventory_ink WHERE min_stock IS NOT NULL AND current_balance <= min_stock`).all()) as any[];
        const lowStockPackaging = (await db.prepare(`SELECT item_name, current_stock, min_stock FROM inventory_packaging WHERE min_stock IS NOT NULL AND current_stock <= min_stock`).all()) as any[];

        if (lowStockInk.length > 0 || lowStockPackaging.length > 0) {
            let inventoryPayload = `🚨 *Daily Inventory Alert*\n\n`;
            if (lowStockInk.length > 0) {
                inventoryPayload += `*Printing Ink*\n`;
                lowStockInk.forEach(i => {
                    inventoryPayload += `• ${i.ink_colour}: ${i.current_balance}${i.unit} (Min: ${i.min_stock}${i.unit})\n`;
                });
                inventoryPayload += `\n`;
            }
            if (lowStockPackaging.length > 0) {
                inventoryPayload += `*Packaging*\n`;
                lowStockPackaging.forEach(p => {
                    inventoryPayload += `• ${p.item_name}: ${p.current_stock} units (Min: ${p.min_stock})\n`;
                });
            }
            inventoryPayload += `\nPlease reorder soon to avoid production delays.`;
            await sendTelegramMessage(inventoryPayload, 'inventory_alerts');
        }

        const apiStatus = telegramSent ? 200 : 500;

        // Log to reminder_logs table for audit
        (await db.prepare(`
            INSERT INTO reminder_logs (due_today_count, overdue_count, total_due_today, total_overdue, callmebot_status)
            VALUES (?, ?, ?, ?, ?)
        `).run(
                    0,
                    0,
                    totalReceivable,
                    totalPayable,
                    apiStatus
                ));

        return NextResponse.json({
            sent: telegramSent,
            data: templateData,
            apiStatus
        });
    } catch (error) {
        console.error('Daily reminder job error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
