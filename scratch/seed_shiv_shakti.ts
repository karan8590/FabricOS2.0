import getDatabase from '../lib/db';
import { hashPassword } from '../lib/auth/password';

async function seed() {
    const db = getDatabase();
    const businessId = 'business_015817';

    console.log("Seeding data for business:", businessId);

    // 1. Seed Customers
    const customers = [
        { name: "Mahavir Fashion", phone: "9876500001", city: "Surat", notes: "Regular wholesale buyer" },
        { name: "Royal Heritage Fabrics", phone: "9876500002", city: "Surat", notes: "Premium sarees" },
        { name: "Anaya Ethnic Wear", phone: "9876500003", city: "Surat", notes: "" },
        { name: "Krishna Prints", phone: "9876500004", city: "Surat", notes: "Printed dress materials" },
        { name: "Velvet Vogue Studio", phone: "9876500005", city: "Surat", notes: "" },
        { name: "Siya Saree House", phone: "9876500006", city: "Surat", notes: "" },
        { name: "Om Creation", phone: "9876500007", city: "Surat", notes: "" },
        { name: "Rangoli Fashion", phone: "9876500008", city: "Surat", notes: "" },
        { name: "Keshav Textile", phone: "9876500009", city: "Surat", notes: "" },
        { name: "Urban Ethnic Studio", phone: "9876500010", city: "Surat", notes: "" },
        { name: "Tulsi Garments", phone: "9876500011", city: "Surat", notes: "" },
        { name: "Pooja Silk Mills", phone: "9876500012", city: "Surat", notes: "" }
    ];

    const insertCustomer = db.prepare(`
        INSERT INTO customers (business_id, name, phone, state, created_at)
        VALUES (?, ?, ?, ?, (EXTRACT(EPOCH FROM NOW()))::integer)
    `);

    for (const c of customers) {
        try {
            await insertCustomer.run(businessId, c.name, c.phone, c.city);
            console.log("Inserted customer:", c.name);
        } catch(e) {
            console.error("Failed to insert customer", c.name, e.message);
        }
    }

    // 2. Seed Vendors
    const vendors = [
        // Fabric Suppliers
        { name: "Radhe Krishna Textile Mills", contact: "9988776655", vendor_type: "Fabric Supplier", address: "Surat", notes: "" },
        { name: "Shree Polyester Hub", contact: "9988776656", vendor_type: "Fabric Supplier", address: "Surat", notes: "" },
        // Job Work Vendors
        { name: "Om Embroidery Works", contact: "9988776657", vendor_type: "Embroidery", address: "Surat", notes: "" },
        { name: "Jay Mataji Dyeing", contact: "9988776658", vendor_type: "Dyeing", address: "Surat", notes: "" },
        { name: "Shiv Printing Studio", contact: "9988776659", vendor_type: "Printing", address: "Surat", notes: "" },
        { name: "Mahadev Stitching Unit", contact: "9988776660", vendor_type: "Stitching", address: "Surat", notes: "" },
        // Transport Vendors
        { name: "Mahadev Logistics", contact: "9988776661", vendor_type: "Transport", driver_name: "Ramesh Patel", vehicle_number: "GJ05AB1234", address: "Surat", notes: "" },
        { name: "Surat Tempo Service", contact: "9988776662", vendor_type: "Transport", driver_name: "Mahesh Bhai", vehicle_number: "GJ05XY9087", address: "Surat", notes: "" },
        // Packaging Vendors
        { name: "Secure Packaging Co.", contact: "9988776663", vendor_type: "Packaging", address: "Surat", notes: "" },
        { name: "Textile Tag Solutions", contact: "9988776664", vendor_type: "Packaging", address: "Surat", notes: "" },
    ];

    const insertVendor = db.prepare(`
        INSERT INTO vendors (business_id, name, contact, vendor_type, address, driver_name, vehicle_number, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, (EXTRACT(EPOCH FROM NOW()))::integer)
    `);

    for (const v of vendors) {
        try {
            await insertVendor.run(businessId, v.name, v.contact, v.vendor_type, v.address, v.driver_name || null, v.vehicle_number || null, v.notes);
            console.log("Inserted vendor:", v.name);
        } catch(e) {
            console.error("Failed to insert vendor", v.name, e.message);
        }
    }

    // 3. Seed Employees
    const employees = [
        { name: "Karan Patel", role: "admin", phone: "9898980001", salary: 45000 },
        { name: "Meet Shah", role: "staff", phone: "9898980002", salary: 30000 },
        { name: "Vishal Parmar", role: "staff", phone: "9898980003", salary: 28000 },
        { name: "Ravi Chauhan", role: "staff", phone: "9898980004", salary: 25000 },
        { name: "Jignesh Solanki", role: "manager", phone: "9898980005", salary: 50000 },
        { name: "Yash Patel", role: "staff", phone: "9898980006", salary: 22000 },
        { name: "Dhruv Mehta", role: "staff", phone: "9898980007", salary: 26000 },
        { name: "Hardik Bhatt", role: "staff", phone: "9898980008", salary: 24000 }
    ];

    const insertEmployee = db.prepare(`
        INSERT INTO users (business_id, name, role, phone, monthly_salary, password_hash, is_active, can_login, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1, (EXTRACT(EPOCH FROM NOW()))::integer)
    `);

    const defaultPasswordHash = await hashPassword("123456");

    for (const e of employees) {
        try {
            await insertEmployee.run(businessId, e.name, e.role, e.phone, e.salary, defaultPasswordHash);
            console.log("Inserted employee:", e.name);
        } catch(e) {
            console.error("Failed to insert employee", e.name, e.message);
        }
    }

    console.log("Seeding completed.");
}

seed().catch(console.error);
