import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
process.env.DATABASE_URL = env.split('\n').find(line => line.startsWith('DATABASE_URL='))?.split('=')[1].replace(/['"]/g, '').trim();
import { hashPassword } from './lib/auth/password';

async function seed() {
    const { getDatabase } = await import('./lib/db');
    const db = getDatabase();
    
    try {
        console.log('Finding workspace...');
        const workspace = (await db.prepare("SELECT * FROM workspaces WHERE TRIM(workspace_name) = 'Omtex Textile Group'").get()) as any;
        if (!workspace) {
            console.error('Omtex Textile Group workspace not found');
            process.exit(1);
        }
        
        const businessId = workspace.id;
        console.log(`Found Workspace ID: ${businessId}`);
        
        const firms = (await db.prepare("SELECT * FROM firms WHERE workspace_id = ?").all(businessId)) as any[];
        console.log(`Found ${firms.length} firms`);
        
        const millsFirm = firms.find(f => f.firm_name.includes('Mills')) || firms[0];
        const printsFirm = firms.find(f => f.firm_name.includes('Prints')) || firms[1] || firms[0];

        console.log('Seeding Employees...');
        const employeesData = [
            { name: 'Mahesh Patel', role: 'manager', phone: '+919876543001', dept: 'Printing', salary: 45000 },
            { name: 'Rakesh Solanki', role: 'manager', phone: '+919876543002', dept: 'Dyeing', salary: 40000 },
            { name: 'Priya Mehta', role: 'manager', phone: '+919876543003', dept: 'Accounts', salary: 35000 },
            { name: 'Devang Shah', role: 'staff', phone: '+919876543004', dept: 'Dispatch', salary: 25000 },
            { name: 'Kiran Chauhan', role: 'staff', phone: '+919876543005', dept: 'Inventory', salary: 22000 },
            { name: 'Bhavesh Parmar', role: 'staff', phone: '+919876543006', dept: 'Printing', salary: 20000 },
            { name: 'Hiral Desai', role: 'staff', phone: '+919876543007', dept: 'Accounts', salary: 28000 },
            { name: 'Vivek Gohil', role: 'staff', phone: '+919876543008', dept: 'Embroidery', salary: 24000 },
            { name: 'Sanjay Jadhav', role: 'staff', phone: '+919876543009', dept: 'Printing', salary: 21000 },
            { name: 'Mitesh Tailor', role: 'staff', phone: '+919876543010', dept: 'Dispatch', salary: 18000 },
            { name: 'Ravi Verma', role: 'staff', phone: '+919876543011', dept: 'Inventory', salary: 20000 },
            { name: 'Jigar Thakkar', role: 'staff', phone: '+919876543012', dept: 'Dyeing', salary: 22000 },
        ];
        
        const passwordHash = await hashPassword('password123');
        const now = Math.floor(Date.now() / 1000);
        
        const employeeIds = [];
        for (const emp of employeesData) {
            const existingUser = await db.prepare("SELECT id FROM users WHERE phone = ?").get(emp.phone);
            if(!existingUser) {
                const res = await db.prepare(`
                    INSERT INTO users (name, phone, password_hash, role, business_id, created_at, monthly_salary)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(emp.name, emp.phone, passwordHash, emp.role, businessId, now, emp.salary);
                employeeIds.push(res.lastInsertRowid);
            } else {
                employeeIds.push((existingUser as any).id);
            }
        }
        
        console.log('Seeding Attendance...');
        // May 1 to May 26 2026
        const startDate = new Date(2026, 4, 1);
        const endDate = new Date(2026, 4, 26);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const isSunday = d.getDay() === 0;
            for (const empId of employeeIds) {
                if(!empId) continue;
                let status = 'present';
                if (isSunday) {
                    // skip or mark present if overtime
                    continue; 
                } else {
                    const r = Math.random();
                    if (r < 0.05) status = 'absent';
                    else if (r < 0.1) status = 'half_day';
                }
                
                try {
                    await db.prepare(`
                        INSERT INTO attendance (business_id, date, employee_id, status, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (date, employee_id) DO NOTHING
                    `).run(businessId, dateStr, empId, status, now);
                } catch(e) {}
            }
        }
        
        console.log('Seeding Customers...');
        const customerNames = [
            'Siya Saree House', 'Rangoli Fashion', 'Anaya Ethnic Wear', 'Krishna Silk Mills',
            'Vardhman Sarees', 'Tulsi Fashion Hub', 'Heer Textile', 'Shree Creation',
            'Kalpana Fashion', 'Rajwadi Prints', 'Surat Textile Co', 'Gopi Sarees',
            'Siddhi Vinayak Fabrics', 'Radha Krishna Tex', 'Madhav Fashion'
        ];
        
        const customerIds = [];
        for (let i = 0; i < customerNames.length; i++) {
            const phone = '+919800000' + i.toString().padStart(3, '0');
            const gst = '24AAAAA' + i.toString().padStart(4, '0') + 'A1Z5';
            
            const existingCust = await db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);
            if (!existingCust) {
                const res = await db.prepare(`
                    INSERT INTO customers (business_id, name, phone, gstin, state, state_code, created_at)
                    VALUES (?, ?, ?, ?, 'Gujarat', '24', ?)
                `).run(businessId, customerNames[i], phone, gst, now);
                customerIds.push(res.lastInsertRowid);
            } else {
                customerIds.push((existingCust as any).id);
            }
        }
        
        console.log('Seeding Vendors...');
        const vendorsData = [
            { name: 'Om Embroidery Works', cat: 'Embroidery', gst: '24BBBBB0001A1Z5' },
            { name: 'Jay Ambe Embroidery', cat: 'Embroidery', gst: '24BBBBB0002A1Z5' },
            { name: 'Shivam Embroidery', cat: 'Embroidery', gst: '24BBBBB0003A1Z5' },
            { name: 'Mahadev Dyeing', cat: 'Dyeing', gst: '24CCCCC0001A1Z5' },
            { name: 'Radhe Dye Chem', cat: 'Dyeing', gst: '24CCCCC0002A1Z5' },
            { name: 'Krishna Dye Works', cat: 'Dyeing', gst: '24CCCCC0003A1Z5' },
            { name: 'Surat Tempo Service', cat: 'Transport', gst: '24DDDDD0001A1Z5' },
            { name: 'Shiv Logistics', cat: 'Transport', gst: '24DDDDD0002A1Z5' },
            { name: 'Om Freight Carrier', cat: 'Transport', gst: '24DDDDD0003A1Z5' },
            { name: 'Balaji Polyester', cat: 'Fabric Supplier', gst: '24EEEEE0001A1Z5' },
            { name: 'RK Fabric Traders', cat: 'Fabric Supplier', gst: '24EEEEE0002A1Z5' },
            { name: 'Om Tex Yarn', cat: 'Fabric Supplier', gst: '24EEEEE0003A1Z5' },
            { name: 'ColorJet Prints', cat: 'Printing', gst: '24FFFFF0001A1Z5' },
            { name: 'Digital Tex Process', cat: 'Printing', gst: '24FFFFF0002A1Z5' },
        ];
        
        for (let i = 0; i < vendorsData.length; i++) {
            const v = vendorsData[i];
            const phone = '+918800000' + i.toString().padStart(3, '0');
            const existing = await db.prepare("SELECT id FROM vendors WHERE contact = ?").get(phone);
            if (!existing) {
                await db.prepare(`
                    INSERT INTO vendors (business_id, name, contact, vendor_type, gst_no, state, state_code, balance, created_at)
                    VALUES (?, ?, ?, ?, ?, 'Gujarat', '24', ?, ?)
                `).run(businessId, v.name, phone, v.cat, v.gst, Math.floor(Math.random() * 50000), now);
            }
        }
        
        console.log('Seeding Designs...');
        const designsData = [
            '1010 Royal Bloom', '2045 Peacock Print', '3012 Lotus Heritage', '7781 Floral Gold',
            '4410 Ethnic Mirror', '5520 Rangoli Weave', '6030 Diamond Silk', '8040 Golden Leaf',
            '9050 Silver Thread', '1060 Ruby Red', '2070 Sapphire Blue', '3080 Emerald Green',
            '4090 Pearl White', '5100 Jet Black', '6110 Sunshine Yellow', '7120 Sunset Orange',
            '8130 Midnight Blue', '9140 Crimson Rose', '1150 Purple Haze', '2160 Magenta Magic'
        ];
        const fabricTypes = ['Polyester', 'Georgette', 'Cotton', 'Viscose', 'Silk Blend'];
        
        const designIds = [];
        for (let i = 0; i < designsData.length; i++) {
            const name = designsData[i];
            const existing = await db.prepare("SELECT id FROM designs WHERE name = ? AND business_id = ?").get(name, businessId);
            if (!existing) {
                const res = await db.prepare(`
                    INSERT INTO designs (business_id, name, category, price_per_meter, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run(businessId, name, fabricTypes[i % fabricTypes.length], 40 + Math.floor(Math.random() * 100), now);
                designIds.push(res.lastInsertRowid);
            } else {
                designIds.push((existing as any).id);
            }
        }
        
        console.log('Seeding Orders...');
        const quantities = [50, 120, 500, 750, 1000, 250, 400, 600, 800, 150];
        // Ensure random dates within May 2026
        // May 1 2026 to May 26 2026
        const minTime = new Date(2026, 4, 1).getTime() / 1000;
        const maxTime = new Date(2026, 4, 26).getTime() / 1000;
        
        for (let i = 0; i < 10; i++) {
            if(!customerIds.length || !designIds.length) break;
            
            const custId = customerIds[Math.floor(Math.random() * customerIds.length)];
            const desId = designIds[Math.floor(Math.random() * designIds.length)];
            const qty = quantities[Math.floor(Math.random() * quantities.length)];
            const price = 40 + Math.floor(Math.random() * 60);
            const total = qty * price;
            
            const orderDate = Math.floor(minTime + Math.random() * (maxTime - minTime));
            
            const assignedFirmId = Math.random() > 0.5 ? millsFirm.id : printsFirm.id;
            const orderNum = 'ORD-' + Math.floor(Math.random() * 1000000);
            
            await db.prepare(`
                INSERT INTO orders (business_id, customer_id, design_id, quantity_meters, total_price, status, order_number, created_at, billing_firm_id)
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            `).run(businessId, custId, desId, qty, total, orderNum, orderDate, assignedFirmId);
        }

        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seed();
