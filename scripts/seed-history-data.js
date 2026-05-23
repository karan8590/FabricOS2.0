const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Seeding rich historical employee attendance and advances (Jan, Feb, Mar, Apr 2026)...');

function seedHistory() {
    try {
        // 1. Fetch employee IDs
        const employees = db.prepare("SELECT id, name FROM users WHERE role = 'staff'").all();
        if (employees.length === 0) {
            console.log('❌ No employees found in users table. Please run the standard seed script first!');
            return;
        }

        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp.name] = emp.id;
        });

        const rohanId = employeeMap['Rohan Mehta'];
        const snehaId = employeeMap['Sneha Reddy'];
        const vikramId = employeeMap['Vikram Singh'];
        const anjaliId = employeeMap['Anjali Gupta'];

        if (!rohanId || !snehaId || !vikramId || !anjaliId) {
            console.log('❌ Could not find all four default employees (Rohan, Sneha, Vikram, Anjali).');
            return;
        }

        // 2. Clean existing historical attendance logs to avoid primary key/unique constraint violations
        db.exec("DELETE FROM attendance WHERE date LIKE '2026-01-%' OR date LIKE '2026-02-%' OR date LIKE '2026-03-%' OR date LIKE '2026-04-%'");
        console.log('✓ Cleaned existing Jan-Apr 2026 attendance records');

        const attendanceInsert = db.prepare(`
            INSERT INTO attendance (date, employee_id, status, overtime_hours, remarks)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Array representing months, their days, and month string
        const months = [
            { name: 'January', days: 31, prefix: '2026-01' },
            { name: 'February', days: 28, prefix: '2026-02' },
            { name: 'March', days: 31, prefix: '2026-03' },
            { name: 'April', days: 30, prefix: '2026-04' }
        ];

        // Seed daily attendance for each month
        months.forEach(month => {
            console.log(`> Seeded ${month.name} 2026 daily logs...`);

            for (let day = 1; day <= month.days; day++) {
                const dateStr = `${month.prefix}-${String(day).padStart(2, '0')}`;

                // --- Rohan Mehta: ~90% present, some half days ---
                let rohanStatus = 'present';
                let rohanOT = 0;
                let rohanRemarks = null;
                if (day === 8 || day === 22) {
                    rohanStatus = 'absent';
                    rohanRemarks = 'Sunday / Off or informed leave';
                } else if (day === 15) {
                    rohanStatus = 'present';
                    rohanRemarks = 'Full present day';
                } else if (day === 5 || day === 19) {
                    rohanRemarks = 'Finished evening batch';
                }
                attendanceInsert.run(dateStr, rohanId, rohanStatus, rohanOT, rohanRemarks);

                // --- Sneha Reddy: ~95% present ---
                let snehaStatus = 'present';
                let snehaOT = 0;
                let snehaRemarks = null;
                if (day === 10) {
                    snehaStatus = 'absent';
                    snehaRemarks = 'Informed leave';
                } else if (day === 24) {
                    snehaStatus = 'present';
                } else if (day === 3 || day === 17) {
                    snehaRemarks = 'Standard print shift';
                }
                attendanceInsert.run(dateStr, snehaId, snehaStatus, snehaOT, snehaRemarks);

                // --- Vikram Singh: ~80% present, high absences ---
                let vikramStatus = 'present';
                let vikramOT = 0;
                let vikramRemarks = null;
                if (day === 5 || day === 14 || day === 23) {
                    vikramStatus = 'absent';
                    vikramRemarks = 'Sick leave';
                } else if (day === 9) {
                    vikramStatus = 'present';
                }
                attendanceInsert.run(dateStr, vikramId, vikramStatus, vikramOT, vikramRemarks);

                // --- Anjali Gupta: 100% present, highly dedicated ---
                let anjaliOT = 0;
                let anjaliRemarks = null;
                if (day === 6 || day === 20) {
                    anjaliRemarks = 'Extra design audit';
                }
                attendanceInsert.run(dateStr, anjaliId, 'present', anjaliOT, anjaliRemarks);
            }
        });

        console.log('✓ Historical attendance calendars successfully inserted!');

        // 3. Clean historical employee advances (keep active ones from May, clean only Jan-Apr ones)
        // Since advances can have different created timestamps, let's clean any other entries older than May 2026
        // Let's keep employee_advances and instalments clean and add structured historical ones
        
        const advInsert = db.prepare(`
            INSERT INTO employee_advances (employee_id, total_amount, amount_repaid, remaining_balance, status, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const instInsert = db.prepare(`
            INSERT INTO advance_instalments (advance_id, date, amount, note, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        const janEpoch = 1767225600; // Jan 1st 2026
        const febEpoch = 1769904000; // Feb 1st 2026
        const marEpoch = 1772323200; // Mar 1st 2026
        const aprEpoch = 1775001600; // Apr 1st 2026

        // --- Historical Advance 1: Rohan Mehta in January 2026 ---
        // total ₹10,000, repaid ₹10,000, balance 0 (Completed)
        const rohanHistResult = advInsert.run(rohanId, 10000, 10000, 0, 'completed', 'New Year Advance', janEpoch + 86400 * 5);
        const rohanHistId = Number(rohanHistResult.lastInsertRowid);
        instInsert.run(rohanHistId, '2026-02-05', 5000, 'Installment 1 (Feb)', febEpoch + 86400 * 4);
        instInsert.run(rohanHistId, '2026-03-05', 5000, 'Installment 2 (Mar)', marEpoch + 86400 * 4);
        console.log('✓ Seeded completed January advance for Rohan Mehta (Repaid in Feb & Mar)');

        // --- Historical Advance 2: Sneha Reddy in March 2026 ---
        // total ₹12,000, repaid ₹12,000, balance 0 (Completed)
        const snehaHistResult = advInsert.run(snehaId, 12000, 12000, 0, 'completed', 'Home repairs', marEpoch + 86400 * 2);
        const snehaHistId = Number(snehaHistResult.lastInsertRowid);
        instInsert.run(snehaHistId, '2026-04-05', 6000, 'Installment 1 (Apr)', aprEpoch + 86400 * 4);
        instInsert.run(snehaHistId, '2026-04-20', 6000, 'Final Installment (Apr)', aprEpoch + 86400 * 19);
        console.log('✓ Seeded completed March advance for Sneha Reddy (Repaid in Apr)');

        // --- Historical Advance 3: Vikram Singh in February 2026 ---
        // total ₹6,000, repaid ₹4,000, balance ₹2,000 (Active)
        const vikramHistResult = advInsert.run(vikramId, 6000, 4000, 2000, 'active', 'Medical expense advance', febEpoch + 86400 * 10);
        const vikramHistId = Number(vikramHistResult.lastInsertRowid);
        instInsert.run(vikramHistId, '2026-03-10', 2000, 'March installment', marEpoch + 86400 * 9);
        instInsert.run(vikramHistId, '2026-04-10', 2000, 'April installment', aprEpoch + 86400 * 9);
        console.log('✓ Seeded active February advance for Vikram Singh (Repaid in Mar & Apr, ₹2,000 outstanding)');

        console.log('\n✅ Rich history database seeded successfully!');
    } catch (error) {
        console.error('❌ Historical seeding failed:', error);
    } finally {
        db.close();
    }
}

seedHistory();
