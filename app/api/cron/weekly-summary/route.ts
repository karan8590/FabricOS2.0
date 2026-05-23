import { NextResponse } from 'next/server';
import fs from 'fs';
import getDatabase from '@/lib/db';
import { getWeeklyReportData } from '@/src/reports/utils/analytics';
import { generateWeeklyPDF } from '@/src/reports/generators/generateWeeklyPDF';
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

        const notifyWeeklyRow = (await db.prepare("SELECT value FROM settings WHERE key = 'notify_weekly_summary'").get()) as any;
        const notifyWeekly = (notifyWeeklyRow?.value ?? 'on') === 'on';

        if (!notifyWeekly && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Weekly summary is turned off' });
        }

        const offsetIST = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(Date.now() + offsetIST);

        // 1. Gather all data
        const data = getWeeklyReportData(todayIST);

        // 2. Generate PDF Report
        pdfPath = await generateWeeklyPDF(todayIST);

        // 3. Construct Short Telegram Summary Message
        const orderDiffStr = data.orderWoWDiff >= 0 
            ? `(+${data.orderWoWDiff} vs last week)` 
            : `(${data.orderWoWDiff} vs last week)`;

        const caption = `📊 *FabricOS — Weekly Summary*\n` +
                        `Week of ${data.dateRange}\n\n` +
                        `*Orders:* ${data.totalOrders} new ${orderDiffStr}\n` +
                        `*Revenue Collected:* ${formatCurrency(data.kpis.revenueCollected)}\n` +
                        `*Expenses:* ${formatCurrency(data.kpis.expenses + data.kpis.salaryPaid)}\n` +
                        `*Net Cash:* ${formatCurrency(data.kpis.netProfit)}\n\n` +
                        `*Pending Invoices:* ${formatCurrency(data.invoices.unpaid + data.invoices.partial + data.invoices.overdue)}\n` +
                        `*Vendor Payments Due:* ${formatCurrency(data.vendorDue)}\n` +
                        `*Attendance Avg:* ${data.attendance.average}%\n\n` +
                        `📎 *Detailed PDF report attached*`;

        // 4. Send PDF via Telegram sendDocument
        const dispatched = await sendTelegramReport(pdfPath, caption, isTest, 'weekly_summary');

        return NextResponse.json({
            sent: dispatched,
            dateRange: data.dateRange,
            totalOrders: data.totalOrders,
            revenueCollected: data.kpis.revenueCollected,
            expenses: data.kpis.expenses + data.kpis.salaryPaid,
            netCash: data.kpis.netProfit,
            pendingInvoices: data.invoices.unpaid + data.invoices.partial + data.invoices.overdue,
            vendorDue: data.vendorDue,
            attAvg: data.attendance.average
        });
    } catch (error) {
        console.error('Weekly summary PDF cron error:', error);
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
