const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Normalizing vendor types...");
        
        const res = await pool.query("SELECT id, name, vendor_type FROM vendors");
        const vendors = res.rows;
        
        for (const vendor of vendors) {
            const name = (vendor.name || '').trim();
            const currentType = (vendor.vendor_type || '').trim().toLowerCase();
            let newType = 'other';
            
            // Map exact matches / substrings
            if (
                name === "Tirupati Poly-Weaves" ||
                name === "Balaji Polyester" ||
                name === "RK Fabric Traders" ||
                name === "Om Tex Yarn" ||
                name === "Tirupati Poly-Weaves" ||
                name.includes("Textile Mills") ||
                name.includes("Polyester Hub") ||
                currentType === "fabric supplier" ||
                currentType === "fabric"
            ) {
                newType = "fabric_supplier";
            } else if (
                name === "Om Embroidery Works" ||
                name === "Jay Ambe Embroidery" ||
                name === "Shivam Embroidery" ||
                name === "Balaji Embroidery & Lace Works" ||
                name.toLowerCase().includes("embroidery") ||
                name === "rajesh" ||
                currentType === "embroidery"
            ) {
                newType = "embroidery";
            } else if (
                name === "Mahadev Dyeing" ||
                name === "Krishna Dye Works" ||
                name === "Radhe Dye Chem" ||
                name === "Jay Mataji Dyeing" ||
                name.toLowerCase().includes("dyeing") ||
                name === "bhavesh" ||
                currentType === "dyeing"
            ) {
                newType = "dyeing";
            } else if (
                name === "ColorJet Prints" ||
                name === "Digital Tex Process" ||
                name === "Shiv Printing Studio" ||
                name.toLowerCase().includes("printing") ||
                currentType === "printing"
            ) {
                newType = "printing";
            } else if (
                name === "Shiv Logistics" ||
                name === "Surat Tempo Service" ||
                name === "Om Freight Carrier" ||
                name === "Mahadev Logistics" ||
                name.includes("Ramesh Bhai") ||
                name.includes("Ramesh Patel") ||
                currentType === "transport" ||
                currentType.includes("tempo")
            ) {
                newType = "transport";
            } else if (
                name === "Secure Packaging Co." ||
                name === "Textile Tag Solutions" ||
                currentType === "packaging"
            ) {
                newType = "packaging";
            }
            
            await pool.query("UPDATE vendors SET vendor_type = $1 WHERE id = $2", [newType, vendor.id]);
            console.log(`Updated vendor "${name}" (ID ${vendor.id}): ${vendor.vendor_type} -> ${newType}`);
        }
        
        console.log("Migration and backfill completed successfully.");
    } catch (err) {
        console.error("Backfill failed:", err);
    } finally {
        await pool.end();
    }
}

run();
