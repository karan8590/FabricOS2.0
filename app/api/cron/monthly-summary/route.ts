import { NextResponse } from 'next/server';
import fs from 'fs';
import getDatabase from '@/lib/db';
import { getMonthlyReportData } from '@/src/reports/utils/analytics';
import { generateMonthlyPDF } from '@/src/reports/generators/generateMonthlyPDF';
import { sendTelegramReport } from '@/src/reports/telegram/sendReport';
import { formatCurrency } from '@/src/reports/utils/formatting';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    let pdfPath: string | null = null;
    try {
        const authHeader = request.headers.get('authorization');
        const hasCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

        const { searchParams } = new URL(request.url);
        const isTest = searchParams.get('test') === 'true';

        if (!hasCronSecret && !isTest) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDatabase();

        // Check if reminders are enabled
        const remindersEnabledRow = (await db.prepare("SELECT value FROM settings WHERE key = 'reminders_enabled'").get()) as any;
        const remindersEnabled = remindersEnabledRow?.value === 'on';

        if (!remindersEnabled && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Reminders disabled' });
        }

        const notifyMonthlyRow = (await db.prepare("SELECT value FROM settings WHERE key = 'notify_monthly_summary'").get()) as any;
        const notifyMonthly = (notifyMonthlyRow?.value ?? 'on') === 'on';

        if (!notifyMonthly && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Monthly summary is turned off' });
        }

        const offsetIST = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(Date.now() + offsetIST);

        // 1. Gather all data
        const data = getMonthlyReportData(todayIST);

        // 2. Generate PDF Report
        pdfPath = await generateMonthlyPDF(todayIST);

        // 3. Construct Short Telegram Summary Message
        const caption = `📊 *FabricOS — ${data.monthName} Summary*\n\n` +
                        `*Revenue Collected:* ${formatCurrency(data.kpis.revenueCollected)}\n` +
                        `*Outstanding:* ${formatCurrency(data.kpis.outstanding)}\n` +
                        `*Expenses:* ${formatCurrency(data.kpis.expenses)}\n` +
                        `*Net Profit:* ${formatCurrency(data.kpis.netProfit)}\n\n` +
                        `*Top Customer:* ${data.topCustomerName}\n` +
                        `*Attendance Avg:* ${data.attendance.average}%\n\n` +
                        `📎 *Detailed PDF report attached*`;

        // 4. Send PDF via Telegram sendDocument
        const dispatched = await sendTelegramReport(pdfPath, caption, isTest, 'monthly_summary');

        return NextResponse.json({
            sent: dispatched,
            monthName: data.monthName,
            revenueCollected: data.kpis.revenueCollected,
            outstanding: data.kpis.outstanding,
            expenses: data.kpis.expenses,
            netProfit: data.kpis.netProfit,
            topCustomer: data.topCustomerName,
            attAvg: data.attendance.average
        });
    } catch (error) {
        console.error('Monthly summary PDF cron error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        // 5. Clean up temporary PDF file
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
            } catch (cleanupErr) {
                console.error('Failed to delete temporary PDF file:', cleanupErr);
            }
        }
    }
}
