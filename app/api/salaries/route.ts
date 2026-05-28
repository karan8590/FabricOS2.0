import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { sendTelegramMessage } from '@/lib/telegram';
import { logAction } from '@/lib/auditLogger';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const monthStr = searchParams.get('month'); // Format: YYYY-MM

        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
            return NextResponse.json({ error: 'Valid month (YYYY-MM) is required' }, { status: 400 });
        }

        const { authorized, error, status } = await checkPermission('employees.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const db = getDatabase();

        // 1. Fetch active employees (excluding customers)
        const employees = (await db.prepare(`
            SELECT id, name, phone, email, role, is_active, monthly_salary as monthlySalary
            FROM users 
            WHERE role != 'customer' AND is_active = 1 AND business_id = ?
            ORDER BY name ASC
        `).all(businessId)) as any[];

        // 2. Fetch saved salary records for the selected month
        const savedSalaries = (await db.prepare(`
            SELECT * FROM salaries WHERE month = ? AND business_id = ?
        `).all(monthStr, businessId)) as any[];
        const savedSalariesMap = new Map(savedSalaries.map(s => [s.employee_id, s]));

        // 3. Fetch active employee advances (status = 'active')
        const activeAdvances = (await db.prepare(`
            SELECT id, employee_id, remaining_balance
            FROM employee_advances
            WHERE status = 'active' AND business_id = ?
        `).all(businessId)) as any[];
        const activeAdvancesMap = new Map(activeAdvances.map(a => [a.employee_id, a]));

        // 4. Fetch attendance logs for the selected month (date matches YYYY-MM-%)
        const attendance = (await db.prepare(`
            SELECT employee_id, status 
            FROM attendance 
            WHERE date LIKE ? AND business_id = ?
        `).all(monthStr + '-%', businessId)) as any[];

        // Group attendance by employee
        const attendanceMap = new Map<number, { present: number; halfDay: number; absent: number }>();
        attendance.forEach(att => {
            const empId = att.employee_id;
            if (!attendanceMap.has(empId)) {
                attendanceMap.set(empId, { present: 0, halfDay: 0, absent: 0 });
            }
            const stats = attendanceMap.get(empId)!;
            if (att.status === 'present' || att.status === 'half_day') stats.present += 1;
            else if (att.status === 'absent') stats.absent += 1;
        });

        // Compute days in month
        const [yearStr, monthNumStr] = monthStr.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthNumStr);
        const totalDays = new Date(year, monthNum, 0).getDate();

        // 5. Generate final lists
        const records = employees.map(emp => {
            const saved = savedSalariesMap.get(emp.id);
            const activeAdv = activeAdvancesMap.get(emp.id);
            const activeAdvanceId = activeAdv ? activeAdv.id : null;
            const remainingBalance = activeAdv ? activeAdv.remaining_balance : 0;
            const attStats = attendanceMap.get(emp.id) || { present: 0, halfDay: 0, absent: 0 };

            const workingDays = totalDays;
            const monthlySalary = emp.monthlySalary || 0;
            const perDayRate = workingDays > 0 ? (monthlySalary / workingDays) : 0;
            
            // Calculation inputs (whole integers only - round down any existing decimal value)
            const presentDays = Math.floor(attStats.present);
            const absentDays = Math.max(0, workingDays - presentDays);
            const halfDays = 0;

            // Math formulas
            const basicEarned = Number((perDayRate * presentDays).toFixed(2));
            const deductions = Number((perDayRate * absentDays).toFixed(2));
            
            // Default advance recovery should be 0 if not saved yet
            const advanceRecovery = saved ? saved.advance_recovery : 0;
            
            // Formula: Net payable = Basic earned - Deductions - Advance recovery
            const netPayable = Math.max(0, Number((basicEarned - deductions - advanceRecovery).toFixed(2)));

            return {
                id: saved ? saved.id : null,
                employeeId: emp.id,
                name: emp.name,
                role: emp.role,
                monthlySalary,
                workingDays,
                presentDays,
                absentDays,
                halfDays,
                basicEarned: saved ? saved.basic_earned : basicEarned,
                deductions: saved ? saved.deductions : deductions,
                advanceRecovery,
                netPayable: saved ? saved.net_payable : netPayable,
                status: saved ? saved.status : 'unpaid',
                activeAdvanceId,
                remainingBalance
            };
        });

        return NextResponse.json({ records, totalDays });
    } catch (error) {
        console.error('Failed to load salaries:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('employees.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const body = await request.json();
        const { action, month } = body;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json({ error: 'Valid month (YYYY-MM) is required' }, { status: 400 });
        }

        const db = getDatabase();

        if (action === 'save_all') {
            const { records } = body;
            if (!Array.isArray(records)) {
                return NextResponse.json({ error: 'Records must be an array' }, { status: 400 });
            }

            const insertStmt = db.prepare(`
                INSERT INTO salaries (
                    business_id, employee_id, month, working_days, present_days, absent_days, half_days, 
                    overtime_hours, basic_earned, overtime_pay, deductions, advance_recovery, net_payable, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(employee_id, month) DO UPDATE SET
                    working_days = excluded.working_days,
                    present_days = excluded.present_days,
                    absent_days = excluded.absent_days,
                    half_days = excluded.half_days,
                    overtime_hours = excluded.overtime_hours,
                    basic_earned = excluded.basic_earned,
                    overtime_pay = excluded.overtime_pay,
                    deductions = excluded.deductions,
                    advance_recovery = excluded.advance_recovery,
                    net_payable = excluded.net_payable
            `);

            // Execute transaction
            const runTx = db.transaction(async (rows: any[]) => {
                for (const row of rows) {
                    insertStmt.run(
                        businessId,
                        row.employeeId,
                        month,
                        row.workingDays,
                        row.presentDays,
                        row.absentDays,
                        row.halfDays,
                        0, // overtime_hours
                        row.basicEarned,
                        0, // overtime_pay
                        row.deductions,
                        row.advanceRecovery,
                        row.netPayable,
                        row.status || 'unpaid'
                    );

                    // Fetch active advance for this employee
                    const activeAdvance = (await db.prepare(`
                        SELECT id, total_amount, remaining_balance
                        FROM employee_advances
                        WHERE employee_id = ? AND status = 'active' AND business_id = ?
                    `).get(row.employeeId, businessId)) as any;

                    if (activeAdvance) {
                        const instalmentDate = `${month}-28`;

                        // Check if an instalment already exists for this month/advance
                        const existingInstalment = (await db.prepare(`
                            SELECT id, amount 
                            FROM advance_instalments
                            WHERE advance_id = ? AND date LIKE ?
                        `).get(activeAdvance.id, month + '-%')) as any;

                        const recoveryAmt = Number(row.advanceRecovery) || 0;

                        if (existingInstalment) {
                            if (recoveryAmt === 0) {
                                // Delete the instalment since recovery is set to 0
                                (await db.prepare(`
                                    DELETE FROM advance_instalments
                                    WHERE id = ?
                                `).run(existingInstalment.id));
                            } else {
                                // Update existing instalment amount
                                (await db.prepare(`
                                    UPDATE advance_instalments
                                    SET amount = ?, note = ?
                                    WHERE id = ?
                                `).run(recoveryAmt, `Payroll Recovery for ${month}`, existingInstalment.id));
                            }
                        } else if (recoveryAmt > 0) {
                            // Insert a new instalment
                            (await db.prepare(`
                                INSERT INTO advance_instalments (advance_id, date, amount, note)
                                VALUES (?, ?, ?, ?)
                            `).run(activeAdvance.id, instalmentDate, recoveryAmt, `Payroll Recovery for ${month}`));
                        }

                        // Recalculate advance totals
                        const repaymentsSum = (await db.prepare(`
                            SELECT SUM(amount) as sum FROM advance_instalments WHERE advance_id = ?
                        `).get(activeAdvance.id)) as any;

                        const repaid = repaymentsSum.sum || 0;
                        let balance = activeAdvance.total_amount - repaid;
                        let statusVal = 'active';

                        if (balance <= 0) {
                            balance = 0;
                            statusVal = 'completed';
                        }

                        // Update advance status and balances
                        (await db.prepare(`
                            UPDATE employee_advances
                            SET amount_repaid = ?, remaining_balance = ?, status = ?
                            WHERE id = ? AND business_id = ?
                        `).run(repaid, balance, statusVal, activeAdvance.id, businessId));
                    }
                }
            });

            runTx(records);
            return NextResponse.json({ message: 'All salaries saved successfully' });
        }

        if (action === 'mark_paid') {
            const { employeeId, paymentMode, reference, paymentDate, advanceRecovery } = body;
            if (!employeeId) {
                return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
            }

            const recoveryAmt = Number(advanceRecovery) || 0;

            const runMarkPaidTx = db.transaction(async () => {
                // Check if salary record already exists in database
                const existingSalary = (await db.prepare(`
                    SELECT id, basic_earned, deductions 
                    FROM salaries 
                    WHERE employee_id = ? AND month = ? AND business_id = ?
                `).get(employeeId, month, businessId)) as any;

                let basicEarned = 0;
                let deductions = 0;
                let salaryId = 0;
                let netPayable = 0;

                if (existingSalary) {
                    salaryId = existingSalary.id;
                    basicEarned = existingSalary.basic_earned;
                    deductions = existingSalary.deductions;

                    netPayable = Math.max(0, Number((basicEarned - deductions - recoveryAmt).toFixed(2)));

                    (await db.prepare(`
                        UPDATE salaries 
                        SET status = 'paid',
                            payment_method = ?,
                            reference_number = ?,
                            payment_date = ?,
                            advance_recovery = ?,
                            net_payable = ?
                        WHERE employee_id = ? AND month = ? AND business_id = ?
                    `).run(
                                            paymentMode || null,
                                            reference || null,
                                            paymentDate || null,
                                            recoveryAmt,
                                            netPayable,
                                            employeeId,
                                            month,
                                            businessId
                                        ));
                } else {
                    // If no pre-saved record was present, let's create a paid record using calculated stats
                    const emp = (await db.prepare('SELECT id, name, monthly_salary FROM users WHERE id = ? AND business_id = ?').get(employeeId, businessId)) as any;
                    if (!emp) {
                        throw new Error('Employee not found');
                    }

                    // Compute total working days
                    const [yearStr, monthNumStr] = month.split('-');
                    const totalDays = new Date(parseInt(yearStr), parseInt(monthNumStr), 0).getDate();

                    // Compute attendance logs
                    const attStats = (await db.prepare(`
                        SELECT 
                            SUM(case when status IN ('present', 'half_day') then 1 else 0 end) as present,
                            SUM(case when status='absent' then 1 else 0 end) as absent
                        FROM attendance 
                        WHERE employee_id = ? AND date LIKE ? AND business_id = ?
                    `).get(employeeId, month + '-%', businessId)) as any;

                    const pres = attStats.present || 0;

                    const monthlySalary = emp.monthly_salary || 0;
                    const perDayRate = totalDays > 0 ? (monthlySalary / totalDays) : 0;
                    
                    // Calculation inputs (whole integers only - round down any existing decimal value)
                    const presentDays = Math.floor(pres);
                    const absentDays = Math.max(0, totalDays - presentDays);

                    basicEarned = Number((perDayRate * presentDays).toFixed(2));
                    deductions = Number((perDayRate * absentDays).toFixed(2));

                    netPayable = Math.max(0, Number((basicEarned - deductions - recoveryAmt).toFixed(2)));

                    const result = (await db.prepare(`
                        INSERT INTO salaries (
                            business_id, employee_id, month, working_days, present_days, absent_days, half_days, 
                            overtime_hours, basic_earned, overtime_pay, deductions, advance_recovery, net_payable, status,
                            payment_method, reference_number, payment_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?)
                    `).run(
                                            businessId,
                                            employeeId,
                                            month,
                                            totalDays,
                                            presentDays,
                                            absentDays,
                                            0, // halfDays is always 0
                                            0, // overtime_hours is always 0
                                            basicEarned,
                                            0, // overtime_pay is always 0
                                            deductions,
                                            recoveryAmt,
                                            netPayable,
                                            paymentMode || null,
                                            reference || null,
                                            paymentDate || null
                                        ));
                    salaryId = result.lastInsertRowid as number;
                }

                // Handle Auto-Populated Expense Entry
                const empRecord = (await db.prepare('SELECT name FROM users WHERE id = ? AND business_id = ?').get(employeeId, businessId)) as any;
                const employeeName = empRecord ? empRecord.name : 'Employee';

                const formatMonthYear = (monthStr: string) => {
                    const [y, m] = monthStr.split('-');
                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
                    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                };
                const monthYearStr = formatMonthYear(month);

                // Safely delete any existing auto-created entries for this salary to ensure perfect idempotency
                (await db.prepare(`
                    DELETE FROM expenses 
                    WHERE isAuto = 1 AND linkedId IN (?, ?) AND business_id = ?
                `).run('salary_' + salaryId, 'advance_recovery_' + salaryId, businessId));

                const paymentTimestamp = paymentDate ? Math.floor(new Date(paymentDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
                const createdAtTimestamp = Math.floor(Date.now() / 1000);

                (await db.prepare(`
                    INSERT INTO expenses (
                        business_id, category, amount, date, description, paymentMode, reference, notes, 
                        addedBy, created_by_user_id, isAuto, linkedId, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(
                                    businessId,
                                    'Staff Salary',
                                    netPayable,
                                    paymentTimestamp,
                                    `${employeeName} salary — ${monthYearStr}`,
                                    paymentMode || 'Cash',
                                    reference || '',
                                    `Payroll generated salary for ${monthYearStr}`,
                                    user?.userId || null,
                                    user?.userId || null,
                                    'salary_' + salaryId,
                                    createdAtTimestamp
                                ));

                if (recoveryAmt > 0) {
                    (await db.prepare(`
                        INSERT INTO expenses (
                            business_id, category, amount, date, description, paymentMode, reference, notes, 
                            addedBy, created_by_user_id, isAuto, linkedId, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    `).run(
                                            businessId,
                                            'Staff Advance',
                                            -recoveryAmt,
                                            paymentTimestamp,
                                            `${employeeName} advance recovery`,
                                            paymentMode || 'Cash',
                                            reference || '',
                                            `Advance recovery via payroll for ${monthYearStr}`,
                                            user?.userId || null,
                                            user?.userId || null,
                                            'advance_recovery_' + salaryId,
                                            createdAtTimestamp
                                        ));
                }

                // Handle Advance Recovery Repayment Ledger if recoveryAmt > 0
                if (recoveryAmt > 0) {
                    const activeAdvance = (await db.prepare(`
                        SELECT id, total_amount, remaining_balance
                        FROM employee_advances
                        WHERE employee_id = ? AND status = 'active' AND business_id = ?
                    `).get(employeeId, businessId)) as any;

                    if (activeAdvance) {
                        const existingInstalment = (await db.prepare(`
                            SELECT id 
                            FROM advance_instalments
                            WHERE advance_id = ? AND date LIKE ?
                        `).get(activeAdvance.id, month + '-%')) as any;

                        if (existingInstalment) {
                            (await db.prepare(`
                                UPDATE advance_instalments
                                SET amount = ?, note = ?
                                WHERE id = ?
                            `).run(recoveryAmt, `Payroll Recovery for ${month}`, existingInstalment.id));
                        } else {
                            const instalmentDate = paymentDate || `${month}-28`;
                            (await db.prepare(`
                                INSERT INTO advance_instalments (advance_id, date, amount, note)
                                VALUES (?, ?, ?, ?)
                            `).run(activeAdvance.id, instalmentDate, recoveryAmt, `Payroll Recovery for ${month}`));
                        }

                        // Recalculate totals for active advance
                        const repaymentsSum = (await db.prepare(`
                            SELECT SUM(amount) as sum FROM advance_instalments WHERE advance_id = ?
                        `).get(activeAdvance.id)) as any;

                        const repaid = repaymentsSum.sum || 0;
                        let balance = activeAdvance.total_amount - repaid;
                        let statusVal = 'active';

                        if (balance <= 0) {
                            balance = 0;
                            statusVal = 'completed';
                        }

                        // Update status and balances in database
                        (await db.prepare(`
                            UPDATE employee_advances
                            SET amount_repaid = ?, remaining_balance = ?, status = ?
                            WHERE id = ? AND business_id = ?
                        `).run(repaid, balance, statusVal, activeAdvance.id, businessId));
                    }
                }
            });

            try {
                await runMarkPaidTx();
            } catch (txErr: any) {
                console.error('Failed to run mark_paid transaction:', txErr);
                return NextResponse.json({ error: txErr.message || 'Failed to update salary payment record' }, { status: 500 });
            }

            // Trigger Telegram salary_alerts notification
            try {
                const empRow = (await db.prepare('SELECT name, monthly_salary FROM users WHERE id = ? AND business_id = ?').get(employeeId, businessId)) as any;
                const empName = empRow?.name || 'Employee';
                const paidTx = (await db.prepare('SELECT net_payable, advance_recovery FROM salaries WHERE employee_id = ? AND month = ? AND business_id = ?').get(employeeId, month, businessId)) as any;
                const paidAmount = paidTx?.net_payable ?? 0;
                const advRec = paidTx?.advance_recovery ?? 0;

                const payloadText = {
                    english: `💵 *FabricOS — Salary Disbursed*\n\nSalary for ${month} has been processed.\n*Employee*: ${empName}\n*Net Paid*: ₹${paidAmount.toLocaleString('en-IN')}${advRec > 0 ? `\n*Advance Recovered*: ₹${advRec.toLocaleString('en-IN')}` : ''}\n*Method*: ${body.paymentMode || 'Cash'}`,
                    gujarati: `💵 *FabricOS — પગાર ચૂકવવામાં આવ્યો*\n\n${month} માટેનો પગાર પ્રક્રિયા કરવામાં આવ્યો છે.\n*કર્મચારી*: ${empName}\n*ચૂકવેલ ચોખ્ખી રકમ*: ₹${paidAmount.toLocaleString('en-IN')}${advRec > 0 ? `\n*એડવાન્સ વસૂલ*: ₹${advRec.toLocaleString('en-IN')}` : ''}\n*પદ્ધતિ*: ${body.paymentMode || 'રોકડ'}`
                };
                sendTelegramMessage(payloadText, 'salary_alerts').catch(console.error);

                // Audit Logging
                await logAction({
                    userId: user?.userId?.toString() || user?.id?.toString() || 'system',
                    userName: user?.name || 'System',
                    userRole: user?.role || 'system',
                    action: 'pay_salary',
                    entity: 'salary',
                    entityId: employeeId.toString(),
                    changes: { month, paidAmount, advRec }
                });
            } catch (tgErr) {
                console.error('[Telegram ERROR] salary_alerts dispatch failed:', tgErr);
            }

            return NextResponse.json({ message: 'Salary marked as paid successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Failed to update salary:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
