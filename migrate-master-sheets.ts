import getDatabase from './lib/db';

async function migrate() {
  const db = getDatabase();
  console.log("Running multi-master-sheet migration...");
  
  try {
    // 1. Create design_master_sheets table
    console.log("Creating design_master_sheets table...");
    await db.exec(`
      CREATE TABLE IF NOT EXISTS design_master_sheets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id TEXT NOT NULL,
        design_id UUID NOT NULL,
        title TEXT,
        image_url TEXT NOT NULL,
        extracted_count INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
        FOREIGN KEY (design_id) REFERENCES catalog_designs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_master_sheets_design ON design_master_sheets(design_id);
    `);

    // 2. Add master_sheet_id to catalog_variants
    console.log("Adding master_sheet_id to catalog_variants...");
    await db.exec(`
      ALTER TABLE catalog_variants ADD COLUMN IF NOT EXISTS master_sheet_id UUID;
    `);

    // Note: We can't easily add a foreign key constraint to an existing column in Postgres via simple ALTER ADD COLUMN if we also want ON DELETE CASCADE easily on sqlite, but this is Postgres.
    // In Postgres:
    await db.exec(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_catalog_variants_master_sheet') THEN
              ALTER TABLE catalog_variants
              ADD CONSTRAINT fk_catalog_variants_master_sheet
              FOREIGN KEY (master_sheet_id) REFERENCES design_master_sheets(id) ON DELETE CASCADE;
          END IF;
      END $$;
    `);

    // 3. Migrate existing master_sheet_url from catalog_designs
    console.log("Migrating existing master_sheet_url data...");
    
    // We only migrate if master_sheet_url column still exists
    try {
        await db.exec(`
            INSERT INTO design_master_sheets (business_id, design_id, title, image_url)
            SELECT business_id, id, 'Master Sheet', master_sheet_url
            FROM catalog_designs
            WHERE master_sheet_url IS NOT NULL AND master_sheet_url != '';
        `);
        console.log("Migrated master sheets.");
        
        // Link existing variants to the newly created master sheet for their design
        await db.exec(`
            UPDATE catalog_variants v
            SET master_sheet_id = ms.id
            FROM design_master_sheets ms
            WHERE v.design_id = ms.design_id AND v.master_sheet_id IS NULL;
        `);
        console.log("Linked existing variants to migrated master sheets.");
        
        // 4. Drop master_sheet_url column from catalog_designs
        console.log("Dropping master_sheet_url column...");
        await db.exec(`
            ALTER TABLE catalog_designs DROP COLUMN IF EXISTS master_sheet_url;
        `);
    } catch (err: any) {
        if (err.message && err.message.includes("column \"master_sheet_url\" does not exist")) {
            console.log("master_sheet_url column already dropped or migrated.");
        } else {
            throw err;
        }
    }
    
    console.log("Migration completed successfully.");
    process.exit(0);
  } catch(e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

migrate();
