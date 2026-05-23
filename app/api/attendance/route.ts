import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('employees.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const month = searchParams.get('month');

        const db = getDatabase();

        if (date) {
            // Fetch daily attendance records
            const records = (await db.prepare(`
                SELECT a.employee_id as employeeId, 
                       CASE WHEN a.status = 'half_day' THEN 'present' ELSE a.status END as status, 
                       a.remarks
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                WHERE a.date = ? AND e.business_id = ?
            `).all(date, businessId));

            return NextResponse.json({ records });
        } else if (month) {
            // Fetch monthly summary
            // For query safety, ensure month matches YYYY-MM
            if (!/^\d{4}-\d{2}$/.test(month)) {
                return NextResponse.json({ error: 'Invalid month format (YYYY-MM)' }, { status: 400 });
            }

            const summaries = (await db.prepare(`
                SELECT 
                    a.employee_id as employeeId,
                    SUM(CASE WHEN a.status IN ('present', 'half_day') THEN 1 ELSE 0 END) as presentDays,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentDays
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                WHERE a.date LIKE ? AND e.business_id = ?
                GROUP BY a.employee_id
            `).all(`${month}-%`, businessId));

            return NextResponse.json({ summaries });
        }

        return NextResponse.json({ error: 'Either date or month query parameter is required' }, { status: 400 });
    } catch (error) {
        console.error('Failed to fetch attendance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('employees.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { date, records } = await request.json();

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
        }

        if (!Array.isArray(records)) {
            return NextResponse.json({ error: 'Records must be an array' }, { status: 400 });
        }

        const db = getDatabase();

        // Validate employees belong to the business
        const employeeIds = records.map(r => r.employeeId);
        if (employeeIds.length > 0) {
            const placeholders = employeeIds.map(() => '?').join(',');
            const validEmployees = (await db.prepare(`SELECT id FROM employees WHERE id IN (${placeholders}) AND business_id = ?`).all(...employeeIds, businessId)) as any[];
            if (validEmployees.length !== employeeIds.length) {
                return NextResponse.json({ error: 'One or more employees do not belong to this business' }, { status: 403 });
            }
        }

        // Run as a transaction for safety and atomicity
        const deleteStmt = db.prepare(`
            DELETE FROM attendance 
            WHERE date = ? AND employee_id IN (
                SELECT id FROM employees WHERE business_id = ?
            )
        `);
        const insertStmt = db.prepare(`
            INSERT INTO attendance (date, employee_id, status, overtime_hours, remarks)
            VALUES (?, ?, ?, ?, ?)
        `);

        const saveTransaction = db.transaction((dateVal: string, recordList: any[]) => {
            // First, delete existing records for this date for this business
            deleteStmt.run(dateVal, businessId);

            // Then insert new records
            for (const rec of recordList) {
                const { employeeId, status: recStatus } = rec;
                // Validations
                if (!employeeId || !['present', 'absent'].includes(recStatus)) {
                    throw new Error('Invalid record format');
                }
                insertStmt.run(dateVal, employeeId, recStatus, 0, null);
            }
        });

        saveTransaction(date, records);

        return NextResponse.json({ message: 'Attendance saved successfully' });
    } catch (error: any) {
        console.error('Failed to save attendance:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
