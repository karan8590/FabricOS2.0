import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || 'active'; // 'active' | 'completed'

        const { authorized, error, status } = await checkPermission('employees.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        
        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const db = getDatabase();

        // 0. Database Migrations and Schema Updates
        try {
            db.exec(`ALTER TABLE employee_advances ADD COLUMN top_ups TEXT DEFAULT '[]'`);
        } catch (e) {}

        // Check if one-time migration has run
        let runMigration = false;
        try {
            const flag = (await db.prepare(`SELECT value FROM settings WHERE key = ?`).get('advanceMigration')) as any;
            if (!flag || flag.value !== 'true') {
                runMigration = true;
            }
        } catch (e) {
            runMigration = true;
        }

        if (runMigration) {
            db.transaction(async () => {
                // Find all employees who have more than one active advance document
                const multiples = (await db.prepare(`
                    SELECT employee_id, COUNT(*) as cnt
                    FROM employee_advances
                    WHERE status = 'active'
                    GROUP BY employee_id
                    HAVING cnt > 1
                `).all()) as any[];

                for (const row of multiples) {
                    const empId = row.employee_id;
                    // Get all active advances for this employee, oldest first (id ASC)
                    const activeCards = (await db.prepare(`
                        SELECT * FROM employee_advances
                        WHERE employee_id = ? AND status = 'active'
                        ORDER BY id ASC
                    `).all(empId)) as any[];

                    if (activeCards.length > 1) {
                        const oldest = activeCards[0];
                        const duplicates = activeCards.slice(1);

                        let newTotal = oldest.total_amount;
                        let newRemaining = oldest.remaining_balance;
                        let existingTopUps = [];
                        try {
                            existingTopUps = JSON.parse(oldest.top_ups || '[]');
                        } catch (e) {}

                        for (const dup of duplicates) {
                            newTotal += dup.total_amount;
                            newRemaining += dup.remaining_balance;

                            // Migrate instalment histories of the duplicate into oldest
                            (await db.prepare(`
                                UPDATE advance_instalments
                                SET advance_id = ?
                                WHERE advance_id = ?
                            `).run(oldest.id, dup.id));

                            let dupTopUps = [];
                            try {
                                dupTopUps = JSON.parse(dup.top_ups || '[]');
                            } catch (e) {}

                            // Record duplicate as a top-up on the oldest card
                            existingTopUps.push({
                                date: new Date(dup.created_at * 1000).toISOString().split('T')[0],
                                amount: dup.total_amount,
                                note: `Merged duplicate advance: ${dup.note || ''}`,
                                addedBy: 'System Migration'
                            });

                            existingTopUps.push(...dupTopUps);

                            // Delete duplicate document
                            (await db.prepare(`DELETE FROM employee_advances WHERE id = ?`).run(dup.id));
                        }

                        // Update oldest card with combined totals and topUps array
                        (await db.prepare(`
                            UPDATE employee_advances
                            SET total_amount = ?, remaining_balance = ?, top_ups = ?
                            WHERE id = ?
                        `).run(newTotal, newRemaining, JSON.stringify(existingTopUps), oldest.id));
                    }
                }

                // Mark migration as completed
                (await db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`).run('advanceMigration', 'true'));
            })();
        }

        // 1. Fetch advances with employee details and topUps
        let query = `
            SELECT ea.id, ea.employee_id as employeeId, u.name as employeeName, u.role,
                   ea.total_amount as totalAmount, ea.amount_repaid as amountRepaid, 
                   ea.remaining_balance as remainingBalance, ea.status, ea.note, ea.created_at as createdAt,
                   ea.top_ups as topUps
            FROM employee_advances ea
            JOIN users u ON ea.employee_id = u.id
            WHERE ea.business_id = ?
        `;

        const params: any[] = [businessId];
        if (statusFilter === 'active') {
            query += ` AND ea.status = 'active' AND ea.remaining_balance > 0`;
        } else if (statusFilter === 'completed') {
            query += ` AND (ea.status = 'completed' OR ea.remaining_balance <= 0)`;
        }
        query += ` ORDER BY ea.created_at DESC`;

        const advances = (await db.prepare(query).all(...params)) as any[];

        // 2. Fetch installments for each advance and parse topUps
        const advancesWithInstalments = advances.map(async adv => {
            const instalments = (await db.prepare(`
                SELECT id, date, amount, note, created_at as createdAt
                FROM advance_instalments
                WHERE advance_id = ?
                ORDER BY date DESC
            `).all(adv.id)) as any[];

            let parsedTopUps = [];
            try {
                parsedTopUps = JSON.parse(adv.topUps || '[]');
            } catch (e) {}

            return {
                ...adv,
                topUps: parsedTopUps,
                instalments
            };
        });

        return NextResponse.json({ advances: advancesWithInstalments });
    } catch (error) {
        console.error('Failed to fetch advances:', error);
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
        const { action } = body;

        const db = getDatabase();

        if (action === 'create') {
            const { employeeId, totalAmount, date, note } = body;

            if (!employeeId || !totalAmount || !date) {
                return NextResponse.json({ error: 'Employee, Total Amount and Date given are required' }, { status: 400 });
            }

            const timestamp = Math.floor(new Date(date).getTime() / 1000) || Math.floor(Date.now() / 1000);

            // Execute in transaction to ensure advance and auto-expense both get inserted/updated together
            db.transaction(async () => {
                // Ensure top_ups column exists in DB
                try {
                    db.exec(`ALTER TABLE employee_advances ADD COLUMN top_ups TEXT DEFAULT '[]'`);
                } catch (e) {}

                // Check if employee already has an active advance
                const activeAdvance = (await db.prepare(`
                    SELECT * FROM employee_advances 
                    WHERE employee_id = ? AND status = 'active' AND business_id = ?
                `).get(employeeId, businessId)) as any;

                const emp = (await db.prepare('SELECT name FROM users WHERE id = ? AND business_id = ?').get(employeeId, businessId)) as any;
                const employeeName = emp ? emp.name : 'Employee';

                if (activeAdvance) {
                    // IF YES - active advance exists:
                    // Update the existing advance:
                    const newTotal = activeAdvance.total_amount + Number(totalAmount);
                    const newRemaining = activeAdvance.remaining_balance + Number(totalAmount);

                    let topUps = [];
                    try {
                        topUps = JSON.parse(activeAdvance.top_ups || '[]');
                    } catch (e) {}

                    topUps.push({
                        date: date,
                        amount: Number(totalAmount),
                        note: note || '',
                        addedBy: user?.name || 'Admin'
                    });

                    (await db.prepare(`
                        UPDATE employee_advances
                        SET total_amount = ?, remaining_balance = ?, top_ups = ?
                        WHERE id = ? AND business_id = ?
                    `).run(newTotal, newRemaining, JSON.stringify(topUps), activeAdvance.id, businessId));

                    // Auto-create Cash Book entry
                    const createdAtTimestamp = Math.floor(Date.now() / 1000);
                    (await db.prepare(`
                        INSERT INTO expenses (
                            business_id, category, amount, date, description, paymentMode, reference, notes,
                            addedBy, created_by_user_id, isAuto, linkedId, created_at
                        ) VALUES (?, ?, ?, ?, ?, 'Cash', '', ?, ?, ?, 1, ?, ?)
                    `).run(
                                            businessId,
                                            'Staff Advance',
                                            Number(totalAmount),
                                            timestamp,
                                            `${employeeName} advance top-up given`,
                                            note || '',
                                            user?.userId || null,
                                            user?.userId || null,
                                            'advance_' + activeAdvance.id,
                                            createdAtTimestamp
                                        ));
                } else {
                    // IF NO - no active advance: Create new advance document
                    const result = (await db.prepare(`
                        INSERT INTO employee_advances (business_id, employee_id, total_amount, amount_repaid, remaining_balance, status, note, created_at, top_ups)
                        VALUES (?, ?, ?, 0, ?, 'active', ?, ?, '[]')
                    `).run(businessId, employeeId, Number(totalAmount), Number(totalAmount), note || null, timestamp));

                    const advanceId = result.lastInsertRowid;

                    // Insert into expenses table
                    const createdAtTimestamp = Math.floor(Date.now() / 1000);
                    (await db.prepare(`
                        INSERT INTO expenses (
                            business_id, category, amount, date, description, paymentMode, reference, notes,
                            addedBy, created_by_user_id, isAuto, linkedId, created_at
                        ) VALUES (?, ?, ?, ?, ?, 'Cash', '', ?, ?, ?, 1, ?, ?)
                    `).run(
                                            businessId,
                                            'Staff Advance',
                                            Number(totalAmount),
                                            timestamp,
                                            `${employeeName} advance given`,
                                            note || '',
                                            user?.userId || null,
                                            user?.userId || null,
                                            'advance_' + advanceId,
                                            createdAtTimestamp
                                        ));
                }
            })();

            return NextResponse.json({ message: 'Employee advance processed successfully' });
        }

        if (action === 'add_instalment') {
            const { advanceId, date, amount, note } = body;

            if (!advanceId || !date || !amount) {
                return NextResponse.json({ error: 'Advance ID, Date and Amount are required' }, { status: 400 });
            }

            const amt = Number(amount);
            if (amt <= 0) {
                return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
            }

            // Execute in transaction to maintain balance integrity
            const runTx = db.transaction(async () => {
                // 1. Insert installment (advance_instalments doesn't strictly need business_id if advance_id is secure, but let's trust advance_id)
                (await db.prepare(`
                    INSERT INTO advance_instalments (advance_id, date, amount, note)
                    VALUES (?, ?, ?, ?)
                `).run(advanceId, date, amt, note || null));

                // 2. Fetch advance info
                const advance = (await db.prepare(`SELECT total_amount FROM employee_advances WHERE id = ? AND business_id = ?`).get(advanceId, businessId)) as any;
                if (!advance) throw new Error('Advance record not found');

                // 3. Sum repayments
                const repaymentsSum = (await db.prepare(`
                    SELECT SUM(amount) as sum FROM advance_instalments WHERE advance_id = ?
                `).get(advanceId)) as any;

                const repaid = repaymentsSum.sum || 0;
                let balance = advance.total_amount - repaid;
                let statusVal = 'active';

                if (balance <= 0) {
                    balance = 0;
                    statusVal = 'completed';
                }

                // 4. Update advance balance
                (await db.prepare(`
                    UPDATE employee_advances
                    SET amount_repaid = ?, remaining_balance = ?, status = ?
                    WHERE id = ? AND business_id = ?
                `).run(repaid, balance, statusVal, advanceId, businessId));
            });

            await runTx();
            return NextResponse.json({ message: 'Repayment instalment added successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Failed to edit advances:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
