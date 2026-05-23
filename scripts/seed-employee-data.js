const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'fabricos.db');
const db = new Database(dbPath);

console.log('Seeding rich employee, attendance, and advances data...');

async function seed() {
    try {
        // 1. Create employees in users table
        const passwordHash = await bcrypt.hash('staff123', 10);
        
        const employeeList = [
            { name: 'Rohan Mehta', phone: '+919999999001', role: 'staff', monthlySalary: 30000 },
            { name: 'Sneha Reddy', phone: '+919999999002', role: 'staff', monthlySalary: 45000 },
            { name: 'Vikram Singh', phone: '+919999999003', role: 'staff', monthlySalary: 24000 },
            { name: 'Anjali Gupta', phone: '+919999999004', role: 'staff', monthlySalary: 35000 }
        ];

        const insertedEmployees = [];

        const userInsert = db.prepare(`
            INSERT OR IGNORE INTO users (phone, password_hash, name, role, is_active, can_login, monthly_salary)
            VALUES (?, ?, ?, ?, 1, 1, ?)
        `);

        for (const emp of employeeList) {
            userInsert.run(emp.phone, passwordHash, emp.name, emp.role, emp.monthlySalary);
            const user = db.prepare('SELECT id, name, monthly_salary FROM users WHERE phone = ?').get(emp.phone);
            insertedEmployees.push(user);
            console.log(`✓ Seeded employee: ${user.name} (Salary: ₹${user.monthly_salary})`);
        }

        // 2. Seed Attendance for May 2026 (Dates: 2026-05-01 to 2026-05-18)
        db.exec("DELETE FROM attendance WHERE date LIKE '2026-05-%'"); // Clean up past May entries to prevent constraint errors
        console.log('✓ Cleaned existing May 2026 attendance logs');

        const attendanceInsert = db.prepare(`
            INSERT INTO attendance (date, employee_id, status, overtime_hours, remarks)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Rohan Mehta: 18 days breakdown
        // Present: 16 days, Absent: 2 days
        const rohanId = insertedEmployees[0].id;
        for (let day = 1; day <= 18; day++) {
            const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
            let status = 'present';
            let ot = 0;
            let remarks = null;

            if (day === 5 || day === 12) {
                status = 'present';
                remarks = 'Full present day';
            } else if (day === 7 || day === 15) {
                status = 'absent';
                remarks = 'Informed leave';
            } else {
                if (day === 3 || day === 8 || day === 14) {
                    remarks = 'Present day';
                }
            }
            attendanceInsert.run(dateStr, rohanId, status, ot, remarks);
        }
        console.log('✓ Seeded attendance array for Rohan Mehta');

        // Sneha Reddy: Present 17 days, Absent 1 day
        const snehaId = insertedEmployees[1].id;
        for (let day = 1; day <= 18; day++) {
            const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
            let status = 'present';
            let ot = 0;
            let remarks = null;

            if (day === 10) {
                status = 'present';
                remarks = 'Personal emergency';
            } else if (day === 16) {
                status = 'absent';
                remarks = 'Sick leave';
            } else {
                if (day === 2 || day === 12) {
                    remarks = 'Excellent shift output';
                }
            }
            attendanceInsert.run(dateStr, snehaId, status, ot, remarks);
        }
        console.log('✓ Seeded attendance array for Sneha Reddy');

        // Vikram Singh: Present 14 days, Absent 4 days
        const vikramId = insertedEmployees[2].id;
        for (let day = 1; day <= 18; day++) {
            const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
            let status = 'present';
            let ot = 0;
            let remarks = null;

            if (day === 4 || day === 11) {
                status = 'present';
            } else if (day === 6 || day === 7 || day === 13 || day === 14) {
                status = 'absent';
                remarks = 'Unexcused absence';
            }
            attendanceInsert.run(dateStr, vikramId, status, ot, remarks);
        }
        console.log('✓ Seeded attendance array for Vikram Singh');

        // Anjali Gupta: Present 18 days
        const anjaliId = insertedEmployees[3].id;
        for (let day = 1; day <= 18; day++) {
            const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
            let ot = 0;
            let remarks = null;

            if (day === 2 || day === 5 || day === 9 || day === 12 || day === 15) {
                remarks = 'High quality embroidery yield';
            }
            attendanceInsert.run(dateStr, anjaliId, 'present', ot, remarks);
        }
        console.log('✓ Seeded attendance array for Anjali Gupta');

        // 3. Seed Advances (Multi-installment table employee_advances and advance_instalments)
        db.exec('DELETE FROM advance_instalments');
        db.exec('DELETE FROM employee_advances');
        console.log('✓ Cleaned existing advances registers');

        const advInsert = db.prepare(`
            INSERT INTO employee_advances (employee_id, total_amount, amount_repaid, remaining_balance, status, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const instInsert = db.prepare(`
            INSERT INTO advance_instalments (advance_id, date, amount, note, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        const nowSec = Math.floor(Date.now() / 1000);

        // Rohan Mehta: ₹20,000 total advance, repaid ₹8,000, balance ₹12,000 (Active)
        const rohanAdvResult = advInsert.run(rohanId, 20000, 8000, 12000, 'active', 'Festival advance', nowSec - 86400 * 17);
        const rohanAdvId = Number(rohanAdvResult.lastInsertRowid);
        instInsert.run(rohanAdvId, '2026-05-05', 5000, 'Repayment Part 1', nowSec - 86400 * 13);
        instInsert.run(rohanAdvId, '2026-05-12', 3000, 'Part Payment 2', nowSec - 86400 * 6);
        console.log('✓ Seeded advance and 2 installments for Rohan Mehta');

        // Sneha Reddy: ₹15,000 total advance, repaid ₹5,000, balance ₹10,000 (Active)
        const snehaAdvResult = advInsert.run(snehaId, 15000, 5000, 10000, 'active', 'Emergency advance', nowSec - 86400 * 16);
        const snehaAdvId = Number(snehaAdvResult.lastInsertRowid);
        instInsert.run(snehaAdvId, '2026-05-10', 5000, 'First installment payment', nowSec - 86400 * 8);
        console.log('✓ Seeded advance and 1 installment for Sneha Reddy');

        // Vikram Singh: ₹5,000 total advance, repaid ₹5,000, balance ₹0 (Completed)
        const vikramAdvResult = advInsert.run(vikramId, 5000, 5000, 0, 'completed', 'Short-term loan', nowSec - 86400 * 30);
        const vikramAdvId = Number(vikramAdvResult.lastInsertRowid);
        instInsert.run(vikramAdvId, '2026-05-02', 5000, 'Full clearance installment', nowSec - 86400 * 16);
        console.log('✓ Seeded complete advance for Vikram Singh');

        console.log('\n✅ Rich employee database seeded successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        db.close();
    }
}

seed();
