const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

const businessId = 'business_795468';
const adminUserId = 25; // Suresh Chandrakant Shah
const passwordHash = '$2b$10$SAdoxyMHN8OTBTOnJToF/ufKlwMqOkpims7wpj1Scz74.ii052MJK'; // password123

// Indian naming directories for generation
const firstNames = ['Rajesh', 'Sanjay', 'Amit', 'Vijay', 'Rahul', 'Sunil', 'Kishore', 'Pankaj', 'Mahendra', 'Manoj', 'Dilip', 'Harish', 'Anil', 'Arvind', 'Girish', 'Dinesh', 'Deepak', 'Prashant', 'Jayesh', 'Tushar', 'Bhavesh', 'Mitesh', 'Hitesh', 'Piyush', 'Ketan', 'Nimesh', 'Shailesh', 'Ashok', 'Ramesh', 'Suresh', 'Bharat', 'Naresh', 'Kanti', 'Mulji', 'Lalji', 'Devji', 'Purushottam', 'Mansukh', 'Raman', 'Chaman', 'Gopal', 'Madhav', 'Kanji', 'Velji'];
const lastNames = ['Patel', 'Shah', 'Mehta', 'Chauhan', 'Gohil', 'Jadhav', 'Tailor', 'Thakkar', 'Solanki', 'Parmar', 'Desai', 'Kapadia', 'Sanghavi', 'Jariwala', 'Chokshi', 'Lakhani', 'Doshi', 'Vora', 'Dhameliya', 'Kakadiya', 'Goti', 'Savaliya', 'Bhalala', 'Ranpara', 'Makwana', 'Vaghela', 'Jhala', 'Jadeja', 'Zala', 'Rathod', 'Mori', 'Chudasama'];

const cityNames = ['Surat', 'Ahmedabad', 'Mumbai', 'Jaipur', 'New Delhi', 'Jodhpur', 'Indore', 'Bhopal'];
const stateMapping = {
    'Surat': { state: 'Gujarat', code: '24' },
    'Ahmedabad': { state: 'Gujarat', code: '24' },
    'Mumbai': { state: 'Maharashtra', code: '27' },
    'Jaipur': { state: 'Rajasthan', code: '08' },
    'Jodhpur': { state: 'Rajasthan', code: '08' },
    'New Delhi': { state: 'Delhi', code: '07' },
    'Indore': { state: 'Madhya Pradesh', code: '23' },
    'Bhopal': { state: 'Madhya Pradesh', code: '23' }
};

const customerSuffixes = ['Saree House', 'Fashion', 'Ethnic Wear', 'Prints', 'Textiles', 'Creation', 'Sarees', 'Fashion Hub', 'Fabrics', 'Boutique', 'Apparels', 'Style Studio', 'Suits', 'Garments', 'Collection'];
const customerPrefixes = ['Siya', 'Rangoli', 'RK', 'Anaya', 'Mahavir', 'Tulsi', 'Vardhman', 'Om', 'Krishna', 'Heer', 'Shree', 'Kalpana', 'Rajwadi', 'Gopi', 'Siddhi Vinayak', 'Radha Krishna', 'Madhav', 'Kalyan', 'Vimal', 'Paras', 'Sonal', 'Pooja', 'Priti', 'Anupam', 'Bhagvati'];

function generateCustomerName(index) {
    // Unique but realistic
    const p = customerPrefixes[index % customerPrefixes.length];
    const s = customerSuffixes[(index + 3) % customerSuffixes.length];
    // Add city for some to create duplicates/exclusives
    if (index === 10 || index === 11) {
        return `Rangoli Fashion (${index === 10 ? 'Surat' : 'Mumbai'})`;
    }
    return `${p} ${s}`;
}

async function run() {
    try {
        console.log("Starting massive seeding process...");

        // Ensure workspace name is updated
        await pool.query(
            "UPDATE workspaces SET workspace_name = 'Omtex Textile Group' WHERE id = $1", 
            [businessId]
        );
        console.log("Workspace updated/verified.");

        // Clear existing tables in dependency-safe order (leaf tables first)
        const tablesToClear = [
            { table: 'payments', key: 'business_id' },
            { table: 'invoices', key: 'business_id' },
            { table: 'dispatch_items', key: 'business_id' },
            { table: 'dispatch_orders', key: 'business_id' },
            { table: 'dispatch_challans', key: 'business_id' },
            { table: 'dispatch_batches', key: 'business_id' },
            { table: 'dispatches', key: 'business_id' },
            { table: 'challans', key: 'business_id' },
            { table: 'order_job_costs', key: 'business_id' },
            { table: 'vendor_payment_instalments', key: 'business_id' },
            { table: 'vendor_payments', key: 'business_id' },
            { table: 'vendor_dispatches', key: 'business_id' },
            { table: 'orders', key: 'business_id' },
            { table: 'attendance', key: 'business_id' },
            { table: 'salaries', key: 'business_id' },
            { table: 'advances', key: 'business_id' },
            { table: 'advance_instalments', key: 'business_id' },
            { table: 'employee_advances', key: 'business_id' },
            { table: 'inventory_history', key: 'business_id' },
            { table: 'inventory_materials', key: 'business_id' },
            { table: 'inventory_fabric_history', key: 'business_id' },
            { table: 'inventory_fabric', key: 'business_id' },
            { table: 'inventory_ink', key: 'business_id' },
            { table: 'inventory_packaging', key: 'business_id' },
            { table: 'whatsapp_reminders', key: 'business_id' },
            { table: 'reminder_logs', key: 'business_id' },
            { table: 'samples', key: 'business_id' },
            { table: 'customers', key: 'business_id' },
            { table: 'vendors', key: 'business_id' },
            { table: 'designs', key: 'business_id' },
            { table: 'firms', key: 'workspace_id' },
            { table: 'expenses', key: 'business_id' },
            { table: 'activity', key: 'business_id' }
        ];

        console.log("Purging old business data (keeping Suresh Shah)...");
        for (const t of tablesToClear) {
            try {
                await pool.query(`DELETE FROM ${t.table} WHERE ${t.key} = $1`, [businessId]);
            } catch (err) {
                console.log(`Note: clear failed or table skipped for "${t.table}":`, err.message);
            }
        }
        
        // Remove non-admin users/employees
        await pool.query("DELETE FROM users WHERE business_id = $1 AND id != $2", [businessId, adminUserId]);
        console.log("Purge complete.");

        // 1. Seed 3 Firms
        console.log("Seeding Firms...");
        const firms = [
            {
                name: 'Omtex Mills Pvt. Ltd.',
                gst: '24AAACO4588K1ZV',
                phone: '9876543211',
                email: 'mills@omtexgroup.com',
                address: 'Plot No. 88-90, GIDC Pandesara, Surat, Gujarat, 394221',
                prefix: 'OMM',
                dc_prefix: 'OMM-DC',
                is_default: true
            },
            {
                name: 'Omtex Digital Prints',
                gst: '24AAACO4588K2ZU',
                phone: '9876543221',
                email: 'prints@omtexgroup.com',
                address: 'Shed C-12, Sachin GIDC Industrial Estate, Surat, Gujarat, 394230',
                prefix: 'ODP',
                dc_prefix: 'ODP-DC',
                is_default: false
            },
            {
                name: 'Omtex Fashion Fabrics',
                gst: '24AAACO4588K3ZT',
                phone: '9876543231',
                email: 'fashion@omtexgroup.com',
                address: '402, Ring Road Textile Market, Surat, Gujarat, 395002',
                prefix: 'OFF',
                dc_prefix: 'OFF-DC',
                is_default: false
            }
        ];

        const firmIds = [];
        for (const f of firms) {
            const res = await pool.query(`
                INSERT INTO firms (
                    workspace_id, firm_name, gst_number, phone, email, address, 
                    invoice_prefix, challan_prefix, is_default, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
            `, [businessId, f.name, f.gst, f.phone, f.email, f.address, f.prefix, f.dc_prefix, f.is_default, Math.floor(Date.now() / 1000)]);
            firmIds.push(res.rows[0].id);
        }
        console.log(`Seeded ${firmIds.length} firms.`);

        // 2. Seed 50 Customers
        console.log("Seeding Customers...");
        const customerIds = [];
        const customerStates = [];
        for (let i = 1; i <= 50; i++) {
            const name = generateCustomerName(i);
            const phone = `+9198795${String(20000 + i)}`;
            const city = cityNames[i % cityNames.length];
            const stateInfo = stateMapping[city];
            const gstin = `${stateInfo.code}ABCDE${String(1000 + i)}F1Z5`;
            
            // Random balance: some have 0, some have significant balance (up to 5,00,000)
            const balance = i % 5 === 0 ? 0 : Math.floor(Math.random() * 450000) + 12000;
            
            const res = await pool.query(`
                INSERT INTO customers (business_id, name, phone, gstin, state, state_code, outstanding_amount, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
            `, [businessId, name, phone, gstin, stateInfo.state, stateInfo.code, balance, Math.floor(Date.now() / 1000)]);
            
            customerIds.push(res.rows[0].id);
            customerStates.push(stateInfo);
        }
        console.log(`Seeded ${customerIds.length} customers.`);

        // 3. Seed 55 Vendors
        console.log("Seeding Vendors...");
        const vendors = [];
        
        // Fabric Suppliers
        const fabSupplierNames = ['Tirupati Poly-Weaves', 'Balaji Polyester', 'RK Fabric Traders', 'Om Tex Yarn', 'Geeta Silk Emporium', 'Vardhman Cotton Suppliers', 'Mahavir Nylon & Yarn', 'Surat Weavers Syndicate', 'Nakoda Textile Mills', 'Ambika Synthetics', 'Radhe Krishna Textile Mills', 'Shree Polyester Hub'];
        fabSupplierNames.forEach((name, i) => {
            vendors.push({ name, type: 'fabric_supplier', mat: 'Fabric Specialization' });
        });

        // Printing
        const printNames = ['ColorJet Prints', 'Digital Tex Process', 'Shiv Printing Studio', 'Jay Ganesh Digital Screen', 'Sai Printing Works', 'Siddhant Processors', 'Narendra Prints', 'Surat Rotary Screen'];
        printNames.forEach((name) => {
            vendors.push({ name, type: 'printing', mat: 'Printing Service' });
        });

        // Embroidery
        const embNames = ['Om Embroidery Works', 'Jay Ambe Embroidery', 'Shivam Embroidery', 'Balaji Embroidery & Lace Works', 'Mahavir Zari Craft', 'Surat Multipunch Embroidery', 'Ganesh Stitch Embroidery', 'Kiran Jari Works', 'Saraswati Punching Unit', 'Riddhi Siddhi Laces'];
        embNames.forEach((name) => {
            vendors.push({ name, type: 'embroidery', mat: 'Embroidery Service' });
        });

        // Dyeing
        const dyeNames = ['Mahadev Dyeing', 'Krishna Dye Works', 'Radhe Dye Chem', 'Jay Mataji Dyeing', 'Anupam Dyeing & Printing', 'Shree Ram Processors', 'Omtex Wet Processing', 'Pashupati Dyeing', 'Bhairav Dye Works', 'Kuber Tex Processing'];
        dyeNames.forEach((name) => {
            vendors.push({ name, type: 'dyeing', mat: 'Dyeing Service' });
        });

        // Transport
        const transNames = ['Shiv Logistics', 'Surat Tempo Service', 'Om Freight Carrier', 'Mahadev Logistics', 'Ramesh Bhai Patel', 'Jay Ambe Roadlines', 'Surat Mumbai Transport', 'Gujarat Cargo Express'];
        transNames.forEach((name) => {
            vendors.push({ name, type: 'transport', mat: 'Transport Services' });
        });

        // Packaging
        const packNames = ['Secure Packaging Co.', 'Textile Tag Solutions', 'Surat Box Depot', 'Goyal Plastic Bags', 'Classic Label Printers'];
        packNames.forEach((name) => {
            vendors.push({ name, type: 'packaging', mat: 'Packaging Materials' });
        });

        // Other
        const otherNames = ['Spectra Premium Inks & Chemicals', 'Mahadev Stitching Unit'];
        otherNames.forEach((name) => {
            vendors.push({ name, type: 'other', mat: 'General Supplies' });
        });

        const vendorIds = [];
        const vendorMap = {}; // mapping by type for relational referencing
        for (let i = 0; i < vendors.length; i++) {
            const v = vendors[i];
            const contact = `+9199000${String(30000 + i)}`;
            const city = 'Surat';
            const state = 'Gujarat';
            const stateCode = '24';
            const gst = `24BBBBB${String(1000 + i)}A1Z${i % 10}`;
            const terms = i % 3 === 0 ? 'Net 30' : (i % 3 === 1 ? 'Net 15' : 'COD');
            
            // Random balances (some 0, some significant payable balance up to 4,50,000)
            const balance = i % 7 === 0 ? 0 : Math.floor(Math.random() * 250000) + 5000;

            const res = await pool.query(`
                INSERT INTO vendors (
                    business_id, name, contact, material_supplied, city, gst_no, state, state_code, 
                    vendor_type, balance, payment_terms, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12) RETURNING id
            `, [businessId, v.name, contact, v.mat, city, gst, state, stateCode, v.type, balance, terms, Math.floor(Date.now() / 1000)]);
            
            const vid = res.rows[0].id;
            vendorIds.push(vid);
            if (!vendorMap[v.type]) vendorMap[v.type] = [];
            vendorMap[v.type].push({ id: vid, name: v.name });
        }
        console.log(`Seeded ${vendorIds.length} vendors.`);

        // 4. Seed 30 Employees
        console.log("Seeding Employees...");
        const depts = ['Production', 'Dispatch', 'Inventory', 'Sales', 'Accounts', 'QC', 'Packing', 'HR'];
        const employeeIds = [];
        
        for (let i = 1; i <= 30; i++) {
            const fName = firstNames[i % firstNames.length];
            const lName = lastNames[i % lastNames.length];
            const empName = `${fName} ${lName}`;
            const phone = `+9198765${String(40000 + i)}`;
            const dept = depts[i % depts.length];
            const salary = Math.floor(18000 + Math.random() * 32000);
            
            const res = await pool.query(`
                INSERT INTO users (
                    name, phone, password_hash, role, business_id, monthly_salary, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
            `, [empName, phone, passwordHash, 'staff', businessId, salary, Math.floor(Date.now() / 1000)]);
            
            employeeIds.push(res.rows[0].id);
        }
        console.log(`Seeded ${employeeIds.length} employees.`);

        // 5. Seed Attendance for employees (May 1 to May 26 2026)
        console.log("Seeding Employee Attendance...");
        const attendanceStartDate = new Date(2026, 4, 1);
        const attendanceEndDate = new Date(2026, 4, 26);
        for (let d = new Date(attendanceStartDate); d <= attendanceEndDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const isSunday = d.getDay() === 0;
            if (isSunday) continue; // Skip Sundays

            for (const empId of employeeIds) {
                const rand = Math.random();
                let status = 'present';
                if (rand < 0.05) status = 'absent';
                else if (rand < 0.08) status = 'half_day';
                
                await pool.query(`
                    INSERT INTO attendance (business_id, date, employee_id, status, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [businessId, dateStr, empId, status, Math.floor(Date.now() / 1000)]);
            }
        }
        console.log("Seeded attendance logs.");

        // 6. Seed 95 Catalog Designs
        console.log("Seeding Catalog Designs...");
        const designCategories = ['Digital Prints', 'Embroidery', 'Saree Border', 'Kurti Print', 'Dupatta Print', 'Foil Print', 'Reactive Print'];
        const designPrefixes = ['DB', 'EMB', 'SB', 'KP', 'DP', 'FP', 'RP'];
        const designNames = ['Lotus Heritage', 'Royal Bloom', 'Peacock Splendor', 'Paisley Classic', 'Geometric Grid', 'Chevron Magic', 'Zari Border', 'Bandhani Classic', 'Leheriya Wave', 'Abstract Brush', 'Floral Fiesta', 'Elephant Parade', 'Vintage Vine', 'Traditional Shubh', 'Modern Mosaic'];
        const designIds = [];
        
        for (let i = 1; i <= 95; i++) {
            const catIdx = i % designCategories.length;
            const code = `${designPrefixes[catIdx]}-${String(1000 + i)}`;
            const name = `${code} ${designNames[i % designNames.length]}`;
            const price = Math.floor(35 + Math.random() * 225); // ₹35 - ₹260 per meter
            
            const res = await pool.query(`
                INSERT INTO designs (business_id, name, category, price_per_meter, created_at)
                VALUES ($1, $2, $3, $4, $5) RETURNING id
            `, [businessId, name, designCategories[catIdx], price, Math.floor(Date.now() / 1000)]);
            
            designIds.push(res.rows[0].id);
        }
        console.log(`Seeded ${designIds.length} designs.`);

        // 7. Seed Inventory raw material stock and Purchase history
        console.log("Seeding Raw Inventory Materials & Purchases...");
        const fabricTypes = ['Polyester', 'Viscose', 'Cotton', 'Georgette', 'Silk Blend'];
        const materialIds = [];
        const fabricSuppliers = vendorMap['fabric_supplier'];
        
        // Seed materials in inventory
        for (let idx = 0; idx < fabricTypes.length; idx++) {
            const ftype = fabricTypes[idx];
            // 3 materials per fabric type (different grades/colors)
            for (let variant = 1; variant <= 3; variant++) {
                const name = `${ftype} Base Crepe Roll (Grade ${variant === 1 ? 'A+' : (variant === 2 ? 'A' : 'B')})`;
                const reorder = 50 + variant * 50;
                
                // Set stock: make variant 3 low stock for alerts!
                let available = Math.floor(200 + Math.random() * 2000);
                if (variant === 3) {
                    available = Math.floor(Math.random() * reorder); // Trigger alert!
                }
                
                const supplier = fabricSuppliers[(idx * 3 + variant) % fabricSuppliers.length];
                
                const res = await pool.query(`
                    INSERT INTO inventory_materials (
                        business_id, name, category, vendor_id, unit, available_stock, reserved_stock, used_stock,
                        rate_per_unit, min_stock, status, last_purchase_date, created_at
                    ) VALUES ($1, $2, 'Fabric', $3, 'm', $4, 0, 0, $5, $6, 'active', $7, $8) RETURNING id
                `, [businessId, name, supplier.id, available, 60 + variant * 15, reorder, '2026-05-15', Math.floor(Date.now() / 1000)]);
                
                materialIds.push(res.rows[0].id);
            }
        }
        
        // Seed 45 Purchase History records
        for (let i = 1; i <= 45; i++) {
            const matId = materialIds[i % materialIds.length];
            const vendor = fabricSuppliers[i % fabricSuppliers.length];
            const qty = Math.floor(500 + Math.random() * 3000);
            const rate = Math.floor(50 + Math.random() * 80);
            const cost = qty * rate;
            const dateStr = `2026-05-${String(Math.floor(Math.random() * 24) + 1).padStart(2, '0')}`;
            
            await pool.query(`
                INSERT INTO inventory_history (
                    business_id, material_id, action_type, quantity, prev_stock, new_stock, 
                    reason, user_id, vendor_id, unit_rate, total_cost, created_at
                ) VALUES ($1, $2, 'Purchase', $3, 0, $3, $4, 25, $5, $6, $7, $8)
            `, [businessId, matId, qty, `Purchased from ${vendor.name}`, vendor.id, rate, cost, Math.floor(new Date(dateStr).getTime() / 1000)]);
        }
        console.log(`Seeded raw inventory and 45 purchases.`);

        // 8. Seed 100 Orders (distributing stages)
        console.log("Seeding Orders...");
        const stages = ['order_added', 'approved', 'embroidery', 'printing', 'dyeing', 'ready', 'delivered'];
        const orderIds = [];
        const orderNumbers = [];
        
        for (let i = 1; i <= 100; i++) {
            const custId = customerIds[i % customerIds.length];
            const desId = designIds[i % designIds.length];
            const qty = Math.floor(100 + Math.random() * 2400); // 100m to 2500m
            const price = Math.floor(65 + Math.random() * 110);
            const total = qty * price;
            
            // May 2026 dates
            const day = String(Math.floor(Math.random() * 25) + 1).padStart(2, '0');
            const orderDateStr = `2026-05-${day}`;
            const orderDateSecs = Math.floor(new Date(orderDateStr).getTime() / 1000);
            const deliveryDateSecs = orderDateSecs + (86400 * (5 + Math.floor(Math.random() * 10)));
            
            // Distribute stages
            let stage;
            const r = i % 20;
            if (r < 2) stage = 'order_added';
            else if (r < 4) stage = 'approved';
            else if (r < 6) stage = 'embroidery';
            else if (r < 7) stage = 'printing';
            else if (r < 8) stage = 'dyeing';
            else if (r < 14) stage = 'ready';
            else stage = 'delivered';

            // Cancel some orders (edge case)
            let status = 'created';
            if (i % 15 === 0) {
                status = 'cancelled';
                stage = 'order_added';
            } else if (stage === 'delivered') {
                status = 'delivered';
            } else if (stage === 'ready') {
                status = 'completed';
            } else if (stage !== 'order_added' && stage !== 'approved') {
                status = 'in_production';
            }
            
            // Billing Firm
            const billingFirmId = firmIds[i % firmIds.length];
            const prefix = firms[i % firms.length].prefix;
            const orderNumber = `${prefix}-ORD-2026-${String(100 + i)}`;
            
            // Specific job work statuses
            const printingStatus = stage === 'printing' ? 'in_progress' : (['dyeing', 'ready', 'delivered'].includes(stage) ? 'completed' : 'pending');
            const embroideryStatus = stage === 'embroidery' ? 'in_progress' : (['printing', 'dyeing', 'ready', 'delivered'].includes(stage) ? 'completed' : 'pending');
            const dyeingStatus = stage === 'dyeing' ? 'in_progress' : (['ready', 'delivered'].includes(stage) ? 'completed' : 'pending');
            
            const fabric = fabricTypes[i % fabricTypes.length];
            const priority = i % 10 === 0 ? 'high' : 'normal';

            const res = await pool.query(`
                INSERT INTO orders (
                    customer_id, design_id, quantity_meters, total_price, status, order_stage, order_number, 
                    delivery_date, order_date, priority, price_per_unit, business_id, base_amount, 
                    printing_cost, embroidery_cost_charged, dyeing_cost_charged, additional_charges, discount, 
                    gst_rate, gst_amount, fabric_type, billing_firm_id, printing_status, embroidery_status, dyeing_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, 0, 0, 0, 0, 5, $14, $15, $16, $17, $18, $19) RETURNING id
            `, [
                custId, desId, qty, total, status, stage, orderNumber, 
                deliveryDateSecs, orderDateSecs, priority, price, businessId, total, 
                Math.floor(total * 0.05), fabric, billingFirmId, printingStatus, embroideryStatus, dyeingStatus
            ]);
            
            orderIds.push(res.rows[0].id);
            orderNumbers.push(orderNumber);
        }
        console.log(`Seeded ${orderIds.length} orders.`);

        // 9. Seed 55 Invoices for completed/delivered orders
        console.log("Seeding Invoices...");
        let invoiceCount = 0;
        
        for (let i = 0; i < orderIds.length; i++) {
            if (invoiceCount >= 55) break;

            const orderId = orderIds[i];
            const orderNum = orderNumbers[i];
            
            // Get order details
            const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
            const ord = orderRes.rows[0];
            
            // Only invoice completed or delivered orders
            if (ord.status !== 'completed' && ord.status !== 'delivered') continue;
            
            const firmIndex = firmIds.indexOf(ord.billing_firm_id);
            const firm = firms[firmIndex !== -1 ? firmIndex : 0];
            const invoiceNum = `${firm.prefix}-INV-2026-${String(100 + invoiceCount).padStart(4, '0')}`;
            
            // Calculate GST
            const taxable = Number(ord.total_price);
            const gstAmount = Math.floor(taxable * 0.05);
            const totalAmount = taxable + gstAmount;
            
            const customerState = customerStates[ord.customer_id % customerStates.length];
            const isLocal = customerState.code === '24';
            
            const cgst = isLocal ? Math.floor(gstAmount / 2) : 0;
            const sgst = isLocal ? Math.floor(gstAmount / 2) : 0;
            const igst = isLocal ? 0 : gstAmount;
            const gstType = isLocal ? 'CGST_SGST' : 'IGST';
            
            const invStatus = invoiceCount % 4 === 0 ? 'paid' : (invoiceCount % 4 === 1 ? 'partial' : 'unpaid');
            const amountPaid = invStatus === 'paid' ? totalAmount : (invStatus === 'partial' ? Math.floor(totalAmount / 2) : 0);
            
            await pool.query(`
                INSERT INTO invoices (
                    business_id, invoice_number, order_id, customer_id, amount, amount_paid, status, 
                    gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount, hsn_code, taxable_amount, 
                    place_of_supply, gst_type, generated_at, due_date, billing_firm_id, firm_snapshot
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 5, $8, $9, $10, $11, '5208', $12, $13, $14, $15, $16, $17, $18)
            `, [
                businessId, invoiceNum, orderId, ord.customer_id, totalAmount, amountPaid, invStatus,
                gstAmount, cgst, sgst, igst, taxable, customerState.state, gstType, 
                ord.order_date, ord.delivery_date, ord.billing_firm_id, JSON.stringify(firm)
            ]);
            
            // Mark invoice as generated on order
            await pool.query(
                "UPDATE orders SET invoice_generated = TRUE WHERE id = $1",
                [orderId]
            );
            
            invoiceCount++;
        }
        console.log(`Seeded ${invoiceCount} invoices.`);

        // 10. Seed Dispatch Challans and transport logs
        console.log("Seeding Dispatch Batches, Items & Challans...");
        const transportVendors = vendorMap['transport'];
        let dispatchCount = 0;
        
        for (let i = 0; i < orderIds.length; i++) {
            if (dispatchCount >= 40) break;
            
            const orderId = orderIds[i];
            const orderNum = orderNumbers[i];
            
            const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
            const ord = orderRes.rows[0];
            
            // Deliver ready or completed orders
            if (ord.order_stage !== 'ready' && ord.order_stage !== 'delivered') continue;
            
            const tVendor = transportVendors[dispatchCount % transportVendors.length];
            const dispatchNum = `DSP-2026-${String(100 + dispatchCount).padStart(4, '0')}`;
            const lrNum = `LR-${String(70000 + dispatchCount)}`;
            
            const dateStr = `2026-05-${String(Math.floor(Math.random() * 25) + 1).padStart(2, '0')}`;
            const dateSecs = Math.floor(new Date(dateStr).getTime() / 1000);
            
            // Seed dispatch batch
            const batchRes = await pool.query(`
                INSERT INTO dispatch_batches (
                    business_id, dispatch_number, vehicle_number, driver_name, driver_phone, 
                    route, dispatch_date, status, transport_vendor_id, delivery_cost, created_at
                ) VALUES ($1, $2, 'GJ05CD1234', 'Ramesh Driver', '+919977553311', 'Ring Road Area', $3, 'completed', $4, 2500, $5) RETURNING id
            `, [businessId, dispatchNum, dateStr, tVendor.id, dateSecs]);
            
            const batchId = batchRes.rows[0].id;
            
            // Seed dispatch order relation
            await pool.query(`
                INSERT INTO dispatch_orders (business_id, dispatch_id, order_id) VALUES ($1, $2, $3)
            `, [businessId, batchId, orderId]);
            
            // Seed dispatch challan
            const dcNum = `DC-2026-${String(100 + dispatchCount).padStart(4, '0')}`;
            await pool.query(`
                INSERT INTO dispatch_challans (
                    challan_number, dispatch_id, customer_id, order_ids, business_id, created_at, billing_firm_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [dcNum, batchId, ord.customer_id, String(orderId), businessId, dateSecs, ord.billing_firm_id]);
            
            dispatchCount++;
        }
        console.log(`Seeded ${dispatchCount} dispatch operations.`);

        // 11. Seed Cashbook payments & Expenses
        console.log("Seeding Cashbook payments & expenses...");
        
        // Seed customer payments (received payments)
        const invoicesRes = await pool.query("SELECT * FROM invoices WHERE business_id = $1", [businessId]);
        const invoices = invoicesRes.rows;
        let payCount = 0;
        
        for (const inv of invoices) {
            if (Number(inv.amount_paid) > 0) {
                const dateSecs = inv.generated_at + 86400; // paid 1 day later
                await pool.query(`
                    INSERT INTO payments (business_id, invoice_id, customer_id, amount, method, reference_number, payment_date, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [businessId, inv.id, inv.customer_id, inv.amount_paid, 'bank_transfer', `TXN${100000 + payCount}`, dateSecs, 'Received on time']);
                payCount++;
            }
        }
        
        // Seed general business expenses (Outflow)
        const expenseCategories = ['Rent', 'Electricity', 'Diesel', 'Machinery Maintenance', 'Office Tea & Snacks', 'Stationery'];
        for (let i = 1; i <= 30; i++) {
            const cat = expenseCategories[i % expenseCategories.length];
            const amt = Math.floor(200 + Math.random() * 8000);
            const dateStr = `2026-05-${String(Math.floor(Math.random() * 25) + 1).padStart(2, '0')}`;
            const dateSecs = Math.floor(new Date(dateStr).getTime() / 1000);
            
            await pool.query(`
                INSERT INTO expenses (
                    business_id, category, amount, date, description, paymentMode, notes, addedBy, type, isAuto
                ) VALUES ($1, $2, $3, $4, $5, 'cash', 'Routine expense paid', 25, 'out', 0)
            `, [businessId, cat, amt, dateSecs, `${cat} charges for the factory`]);
        }
        
        console.log(`Seeded cashbook payments and expenses.`);
        console.log("MASSSIVE ENTERPRISE SEEDING COMPLETED 100% SUCCESSFULLY.");
        process.exit(0);

    } catch (err) {
        console.error("Massive seed script failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
