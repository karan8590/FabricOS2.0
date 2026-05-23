import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const hasCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

        const { searchParams } = new URL(request.url);
        const isTest = searchParams.get('test') === 'true';

        if (!hasCronSecret && !isTest) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDatabase();

        // Fetch settings in a single query
        const settingsRows = (await db.prepare("SELECT key, value FROM settings WHERE business_id = 'business_001' AND key IN ('reminders_enabled', 'notify_attendance')").all()) as any[];
        const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

        const remindersEnabled = settings['reminders_enabled'] === 'on';
        if (!remindersEnabled && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Reminders disabled' });
        }

        const notifyAttendance = (settings['notify_attendance'] ?? 'on') === 'on';
        if (!notifyAttendance && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Attendance reminder is turned off' });
        }

        const offsetIST = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(Date.now() + offsetIST);
        const todayStr = todayIST.toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Check if attendance has already been marked today
        const attendanceCountRow = (await db.prepare("SELECT count(*) as count FROM attendance WHERE date = ?").get(todayStr)) as any;
        const isMarked = (attendanceCountRow?.count || 0) > 0;

        if (isMarked && !isTest) {
            return NextResponse.json({ sent: false, reason: 'Attendance already marked today' });
        }

        // 2. Fetch the number of active staff/employees
        const activeStaffRow = (await db.prepare("SELECT count(*) as count FROM users WHERE role = 'staff' AND is_active = 1").get()) as any;
        const employeeCount = activeStaffRow?.count || 0;

        if (employeeCount === 0 && !isTest) {
            return NextResponse.json({ sent: false, reason: 'No active staff registered' });
        }

        // Format date as "19 May"
        const formattedDate = todayIST.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

        const msgPayload = {
            english: `*FabricOS — Attendance Reminder*\n\nAttendance for today (${formattedDate}) has not been marked yet.\n\n*${employeeCount}* employees are unaccounted for.\n\nPlease mark attendance now.`,
            gujarati: `*FabricOS — હાજરી રીમાઇન્ડર*\n\nઆજ (${formattedDate}) ની હાજરી હજી નોંધાઈ નથી.\n\n*${employeeCount}* કર્મચારીઓ અનુત્તર છે.\n\nકૃપા કરીને હવે હાજરી નોંધો.`
        };

        await sendTelegramMessage(msgPayload, 'attendance_reminder');

        return NextResponse.json({ sent: true, employeeCount });
    } catch (error) {
        console.error('Attendance reminder cron error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
