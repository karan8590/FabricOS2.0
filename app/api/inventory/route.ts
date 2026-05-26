import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { sendTelegramMessage } from '@/lib/telegram';
import { logAction } from '@/lib/auditLogger';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'All'; // 'Fabric' | 'Ink' | 'Packaging' | 'Accessories' | 'All'

        const { authorized, error, status, user } = await checkPermission('inventory.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId || 'business_001';
        const db = getDatabase();

        // --- AUTO-CLEAN ORPHAN RESERVATIONS & RESYNC ---
        const orphans = (await db.prepare(`
            SELECT h.id, h.material_id, h.quantity, h.linked_order_id, h.reason
            FROM inventory_history h 
            LEFT JOIN orders o ON h.linked_order_id = o.id 
            WHERE h.business_id = ? AND h.action_type = 'Reserved' AND h.linked_order_id IS NOT NULL AND o.id IS NULL AND COALESCE(h.is_deleted, false) = false
        `).all(businessId)) as any[];

        if (orphans.length > 0) {
            let totalRestored = 0;
            for (const orphan of orphans) {
                console.log(`[DEBUG] Releasing orphan reservation for missing Order ID: ${orphan.linked_order_id} (${orphan.reason})`);
                
                // 1. Create reversal movement
                await db.prepare(`
                    INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, is_deleted)
                    VALUES (?, ?, 'Release', ?, 0, 0, ?, false)
                `).run(businessId, orphan.material_id, orphan.quantity, `Released: Order Deleted (was ${orphan.reason})`);

                // 2. Mark old reserve as soft_deleted
                await db.prepare(`UPDATE inventory_history SET is_deleted = true WHERE id = ?`).run(orphan.id);
                
                totalRestored += Number(orphan.quantity);
            }
            console.log(`[CLEANUP] Released ${orphans.length} orphan reservation entries (Total ${totalRestored}m).`);
        }
        
        // 3. Centralized recalulcation logic to fix mismatch
        const { syncAllMaterialStocks } = await import('@/lib/inventory/sync');
        await syncAllMaterialStocks(db, businessId);
        // --------------------------------------

        // 1. Fetch vendors
        const vendors = (await db.prepare(`SELECT id, name, contact, city, gst_no, vendor_type FROM vendors WHERE business_id = ? ORDER BY name ASC`).all(businessId)) as any[];
        console.log(`[API /inventory] Fetched ${vendors?.length} vendors for businessId: ${businessId}`);
        
        // 2. Fetch materials based on category
        let query = `
            SELECT m.*, v.name as vendor_name 
            FROM inventory_materials m 
            LEFT JOIN vendors v ON m.vendor_id = v.id 
            WHERE m.business_id = ? AND COALESCE(m.is_deleted, false) = false
            AND m.category IN ('Fabric', 'Viscose', 'Polyester', 'Cotton', 'Other Fabric')
        `;
        const params: any[] = [businessId];

        query += ` ORDER BY m.last_purchase_date DESC, m.id DESC`;

        const materials = (await db.prepare(query).all(...params)) as any[];

        // Dynamically compute inventory from history instead of relying on DB columns
        const allHistory = (await db.prepare(`SELECT * FROM inventory_history WHERE business_id = ? AND COALESCE(is_deleted, false) = false`).all(businessId)) as any[];
        const { computeInventory } = await import('@/lib/inventory');
        
        const historyByMaterial = allHistory.reduce((acc: any, h: any) => {
            if (!acc[h.material_id]) acc[h.material_id] = [];
            acc[h.material_id].push(h);
            return acc;
        }, {});

        for (const m of materials) {
            const h = historyByMaterial[m.id] || [];
            const computed = computeInventory(h);
            
            // Override the raw DB columns so the UI gets the guaranteed live numbers
            m.available_stock = computed.available;
            m.reserved_stock = computed.reserved;
            m.used_stock = computed.used;
            m.purchased_stock = computed.purchased;
            m.computed_available = computed.available; // Explicit flag that this is computed
        }


        // 3. Compute dashboard widgets from filtered materials
        let totalValue = 0;
        let totalAvailableFabric = 0;
        let reservedFabric = 0;
        let lowStockCount = 0;

        for (const m of materials) {
            totalValue += (Math.max(0, Number(m.available_stock)) + Math.max(0, Number(m.reserved_stock))) * Math.max(0, Number(m.rate_per_unit));
            totalAvailableFabric += Math.max(0, Number(m.available_stock));
            reservedFabric += Math.max(0, Number(m.reserved_stock));
            if (Number(m.available_stock) <= Number(m.min_stock) && m.min_stock > 0) {
                lowStockCount++;
            }
        }

        // Fetch monthly procurement (purchases this month)
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0, 0, 0, 0);
        const monthlyStartUnix = Math.floor(currentMonthStart.getTime() / 1000);

        const monthlyPurchases = (await db.prepare(`
            SELECT SUM(quantity * m.rate_per_unit) as monthly_total
            FROM inventory_history h
            JOIN inventory_materials m ON h.material_id = m.id
            WHERE h.business_id = ? AND h.action_type = 'Purchase' AND h.created_at >= ? AND COALESCE(h.is_deleted, false) = false
        `).get(businessId, monthlyStartUnix)) as any;
        
        const monthlyProcurement = monthlyPurchases?.monthly_total || 0;

        // Pending vendor payments
        const pendingPayments = (await db.prepare(`
            SELECT SUM(balance) as pending_total FROM vendors WHERE business_id = ?
        `).get(businessId)) as any;
        const pendingVendorPayments = pendingPayments?.pending_total || 0;

        const widgets = {
            totalValue,
            totalAvailableFabric,
            reservedFabric,
            lowStockCount,
            monthlyProcurement,
            pendingVendorPayments
        };

        return NextResponse.json({ data: materials, vendors, widgets });
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('inventory.view'); 
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId;
        const db = getDatabase();

        const body = await request.json();
        const { action } = body;

        if (action === 'delete_material') {
            const { id } = body;
            const mat = await db.prepare('SELECT * FROM inventory_materials WHERE id = ? AND business_id = ?').get(id, businessId) as any;
            if (!mat) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
            
            if (Number(mat.reserved_stock) > 0) {
                return NextResponse.json({ error: 'This material is currently reserved for active orders.' }, { status: 400 });
            }

            const history = await db.prepare(`SELECT reason, vendor_id FROM inventory_history WHERE material_id = ? AND business_id = ? AND action_type = 'Purchase'`).all(id, businessId) as any[];

            for (const h of history) {
                const purchaseRef = h.reason;
                if (purchaseRef && (purchaseRef.startsWith('INV-PUR-') || purchaseRef.startsWith('INV-PROC-'))) {
                    await db.prepare(`UPDATE expenses SET is_deleted = TRUE, deleted_at = ? WHERE reference = ? AND business_id = ?`).run(Math.floor(Date.now() / 1000), purchaseRef, businessId);
                    await db.prepare(`UPDATE vendor_payments SET is_deleted = TRUE, deleted_at = ? WHERE order_number = ? AND business_id = ?`).run(Math.floor(Date.now() / 1000), purchaseRef, businessId);
                }
            }

            await db.prepare('UPDATE inventory_history SET is_deleted = TRUE, deleted_at = ? WHERE material_id = ? AND business_id = ?').run(Math.floor(Date.now() / 1000), id, businessId);
            await db.prepare('UPDATE inventory_materials SET is_deleted = TRUE, deleted_at = ? WHERE id = ? AND business_id = ?').run(Math.floor(Date.now() / 1000), id, businessId);
            return NextResponse.json({ success: true });
        }



        if (action === 'delete_history') {
            const { historyId } = body;
            
            const history = await db.prepare(`SELECT * FROM inventory_history WHERE id = ? AND business_id = ?`).get(historyId, businessId) as any;
            if (!history) return NextResponse.json({ error: 'History record not found' }, { status: 404 });
            if (history.is_deleted) return NextResponse.json({ error: 'This inventory record was already removed.' }, { status: 400 });

            // Fetch current material to check stock
            const material = await db.prepare(`SELECT available_stock FROM inventory_materials WHERE id = ? AND business_id = ?`).get(history.material_id, businessId) as any;
            if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

            let decrementAmount = 0;
            if (history.action_type === 'Purchase') {
                decrementAmount = Number(history.quantity);
            } else if (history.action_type === 'Adjustment') {
                decrementAmount = Number(history.quantity);
            }

            if (decrementAmount > 0) {
                if (Number(material.available_stock) - decrementAmount < 0) {
                    return NextResponse.json({ error: 'Cannot delete this procurement because stock has already been consumed/reserved.' }, { status: 400 });
                }
            }

            // Decrement material stock
            await db.prepare(`UPDATE inventory_materials SET available_stock = available_stock - ? WHERE id = ? AND business_id = ?`).run(decrementAmount, history.material_id, businessId);

            if (history.action_type === 'Purchase') {
                // Remove linked cashbook and vendor payment
                if (history.vendor_id) {
                    const cost = Number(history.total_cost || 0);
                    if (cost > 0) {
                        await db.prepare(`UPDATE vendors SET balance = balance - ? WHERE id = ? AND business_id = ?`).run(cost, history.vendor_id, businessId);
                    }
                }
                const purchaseRef = history.reason;
                if (purchaseRef && (purchaseRef.startsWith('INV-PUR-') || purchaseRef.startsWith('INV-PROC-'))) {
                    await db.prepare(`UPDATE expenses SET is_deleted = TRUE, deleted_at = ? WHERE reference = ? AND business_id = ?`).run(Math.floor(Date.now() / 1000), purchaseRef, businessId);
                    await db.prepare(`UPDATE vendor_payments SET is_deleted = TRUE, deleted_at = ? WHERE order_number = ? AND business_id = ?`).run(Math.floor(Date.now() / 1000), purchaseRef, businessId);
                }
            }

            await db.prepare(`UPDATE inventory_history SET is_deleted = TRUE, deleted_at = ? WHERE id = ? AND business_id = ?`).run(Math.floor(Date.now() / 1000), historyId, businessId);
            return NextResponse.json({ success: true });
        }

        if (action === 'add_purchase') {
            // New purchase flow
            const { materialId, name, category, vendorId, vendorName, color, gsm, unit, quantityPurchased, ratePerUnit, invoiceNo, purchaseDate, notes, minStock, dueDays } = body;

            if (!name || !category || !vendorId || !quantityPurchased || !ratePerUnit || !unit) {
                return NextResponse.json({ error: 'Missing required purchase fields' }, { status: 400 });
            }

            // Normalize category properly
            let normCategory = 'Other';
            const lowerCatInput = category.toLowerCase();
            if (lowerCatInput === 'fabric' || lowerCatInput === 'polyester' || lowerCatInput === 'cotton' || lowerCatInput === 'silk' || lowerCatInput === 'viscose') {
                normCategory = 'Fabric';
            } else if (lowerCatInput === 'ink' || lowerCatInput === 'printing_ink') {
                normCategory = 'Ink';
            } else if (lowerCatInput === 'packaging') {
                normCategory = 'Packaging';
            } else if (lowerCatInput === 'accessories') {
                normCategory = 'Accessories';
            }

            const qty = Number(quantityPurchased);
            const rate = Number(ratePerUnit);
            const cost = qty * rate;
            let mId = materialId;
            let prevStock = 0;

            if (!mId) {
                // Try to find existing material by name, category and vendor
                const existingByName = await db.prepare(`SELECT id FROM inventory_materials WHERE name = ? AND category = ? AND vendor_id = ? AND business_id = ? AND COALESCE(is_deleted, false) = false`).get(name, normCategory, Number(vendorId), businessId) as any;
                if (existingByName) {
                    mId = existingByName.id;
                }
            }

            if (mId) {
                // Update existing material
                const existing = (await db.prepare(`SELECT available_stock FROM inventory_materials WHERE id = ? AND business_id = ?`).get(mId, businessId)) as any;
                if (!existing) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
                prevStock = Number(existing.available_stock);
                
                await db.prepare(`
                    UPDATE inventory_materials 
                    SET available_stock = available_stock + ?, rate_per_unit = ?, last_purchase_date = ?
                    WHERE id = ? AND business_id = ?
                `).run(qty, rate, purchaseDate, mId, businessId);
            } else {
                // Create new material
                const res = await db.prepare(`
                    INSERT INTO inventory_materials (business_id, name, category, vendor_id, color, gsm, unit, available_stock, reserved_stock, used_stock, rate_per_unit, min_stock, last_purchase_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
                `).run(businessId, name, normCategory, Number(vendorId), color || null, gsm || null, unit, qty, rate, Number(minStock || 0), purchaseDate);
                mId = res.lastInsertRowid;
            }
            
            const purchaseRef = `INV-PROC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // Create inventory history log
            await db.prepare(`
                INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, vendor_id, user_id, unit_rate, total_cost)
                VALUES (?, ?, 'Purchase', ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(businessId, mId, qty, prevStock, prevStock + qty, purchaseRef, Number(vendorId), user?.id || 1, rate, cost);

            // Auto Cashbook Expense
            const expenseDate = Math.floor(new Date(purchaseDate).getTime() / 1000);
            const vName = vendorName || 'Vendor';
            // Vendor Payable
            // If vendor purchase, update expenses and vendor balance
            if (vendorId) {
                // Update vendor balance (payable)
                await db.prepare(`
                    UPDATE vendors SET balance = balance + ? WHERE id = ? AND business_id = ?
                `).run(cost, Number(vendorId), businessId);

                let expenseCategory = 'MISCELLANEOUS';
                let expenseDesc = `Inventory Purchase — ${name} (${qty}${unit})`;

                const lowerCat = category.toLowerCase();
                if (lowerCat === 'fabric' || lowerCat === 'polyester' || lowerCat === 'cotton' || lowerCat === 'silk') {
                    expenseCategory = 'FABRIC PURCHASE';
                    expenseDesc = `Inventory Purchase — ${name} Fabric (${qty}${unit})`;
                } else if (lowerCat === 'ink') {
                    expenseCategory = 'PRINTING INK';
                    expenseDesc = `Ink Procurement — ${name} (${qty}${unit})`;
                } else if (lowerCat === 'packaging') {
                    expenseCategory = 'PACKAGING MATERIAL';
                    expenseDesc = `Packaging Procurement — ${name} (${qty}${unit})`;
                } else if (lowerCat === 'accessories') {
                    expenseCategory = 'ACCESSORIES';
                    expenseDesc = `Accessories Procurement — ${name} (${qty}${unit})`;
                } else if (lowerCat === 'embroidery material') {
                    expenseCategory = 'EMBROIDERY MATERIAL';
                    expenseDesc = `Embroidery Procurement — ${name} (${qty}${unit})`;
                }

                // Log in expenses (Accounts Payable)
                await db.prepare(`
                    INSERT INTO expenses (business_id, type, amount, date, description, category, reference, isPending, addedBy, paymentMode)
                    VALUES (?, 'out', ?, ?, ?, ?, ?, 1, ?, 'Vendor Credit')
                `).run(
                    businessId, 
                    cost, 
                    Math.floor(new Date(purchaseDate || Date.now()).getTime() / 1000), 
                    expenseDesc, 
                    expenseCategory, 
                    purchaseRef, 
                    user?.id || 1
                );

                // Add to Vendor Payments log
                if (dueDays !== undefined && dueDays !== null && dueDays !== '') {
                    const parsedDueDays = Number(dueDays);
                    const purchaseDateObj = new Date(purchaseDate || Date.now());
                    const dueDateObj = new Date(purchaseDateObj.getTime());
                    dueDateObj.setDate(dueDateObj.getDate() + parsedDueDays);
                    const formattedDueDate = dueDateObj.toISOString().split('T')[0];

                    let status = 'unpaid';
                    const now = new Date();
                    now.setHours(0,0,0,0);
                    const dueObjStart = new Date(formattedDueDate);
                    dueObjStart.setHours(0,0,0,0);
                    
                    if (dueObjStart < now) status = 'overdue';
                    
                    let workType = 'OTHER';
                    if (expenseCategory === 'FABRIC PURCHASE') workType = 'FABRIC';
                    else if (expenseCategory === 'PRINTING INK') workType = 'PRINTING INK';
                    else if (expenseCategory === 'PACKAGING MATERIAL') workType = 'PACKAGING';
                    else if (expenseCategory === 'ACCESSORIES') workType = 'ACCESSORIES';
                    else if (expenseCategory === 'EMBROIDERY MATERIAL') workType = 'EMBROIDERY MATERIAL';

                    await db.prepare(`
                        INSERT INTO vendor_payments (business_id, vendor_id, vendor_name, vendor_phone, order_number, work_type, total_amount, amount_paid, balance, due_date, status, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
                    `).run(
                        businessId, 
                        Number(vendorId), 
                        vendorName || 'Vendor', 
                        'N/A', 
                        purchaseRef, 
                        workType, 
                        cost, 
                        cost, 
                        formattedDueDate, 
                        status, 
                        expenseDesc
                    );
                }
            }


            // Phase 8: Audit Log action
            await logAction(
                db,
                user?.id || 1,
                businessId,
                'Inventory Purchased',
                `Purchased ${qty}${unit} of ${name} from ${vName}`
            );

            return NextResponse.json({ message: 'Purchase registered successfully' });
        }

        if (action === 'get_history') {
            const { materialId } = body;
            
            // --- AUTO-CLEAN ORPHAN RESERVATIONS (Safety Check) ---
            const orphans = (await db.prepare(`
                SELECT h.id, h.material_id, h.quantity, h.linked_order_id, h.reason
                FROM inventory_history h 
                LEFT JOIN orders o ON h.linked_order_id = o.id 
                WHERE h.material_id = ? AND h.business_id = ? AND h.action_type = 'Reserved' AND h.linked_order_id IS NOT NULL AND o.id IS NULL AND COALESCE(h.is_deleted, false) = false
            `).all(materialId, businessId)) as any[];

            if (orphans.length > 0) {
                let totalRestored = 0;
                for (const orphan of orphans) {
                    console.log(`[DEBUG] Releasing orphan reservation for missing Order ID: ${orphan.linked_order_id} (${orphan.reason})`);
                    
                    // 1. Create reversal movement
                    await db.prepare(`
                        INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, is_deleted)
                        VALUES (?, ?, 'Release', ?, 0, 0, ?, false)
                    `).run(businessId, orphan.material_id, orphan.quantity, `Released: Order Deleted (was ${orphan.reason})`);

                    // 2. Mark old reserve as soft_deleted
                    await db.prepare(`UPDATE inventory_history SET is_deleted = true WHERE id = ?`).run(orphan.id);
                    
                    totalRestored += Number(orphan.quantity);
                }
                console.log(`[CLEANUP] Released ${orphans.length} orphan reservation entries (Total ${totalRestored}m).`);
                
                // Resync this specific material
                const { syncAllMaterialStocks } = await import('@/lib/inventory/sync');
                await syncAllMaterialStocks(db, businessId); // Note: we sync all since it's fast anyway, but ideally just one.
            }
            // -----------------------------------------------------

            const history = (await db.prepare(`
                SELECT h.*, u.name as user_name, v.name as vendor_name
                FROM inventory_history h
                LEFT JOIN users u ON h.user_id = u.id
                LEFT JOIN vendors v ON h.vendor_id = v.id
                WHERE h.material_id = ? AND h.business_id = ? AND COALESCE(h.is_deleted, false) = false
                ORDER BY h.created_at DESC
            `).all(materialId, businessId)) as any[];
            
            const { computeInventory } = await import('@/lib/inventory');
            const summary = computeInventory(history);
            
            return NextResponse.json({ history, summary });
        }

        if (action === 'manual_adjust') {
            const { materialId, adjustmentQty, reason } = body;
            const existing = (await db.prepare(`SELECT available_stock FROM inventory_materials WHERE id = ? AND business_id = ?`).get(materialId, businessId)) as any;
            if (!existing) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
            
            const prevStock = Number(existing.available_stock);
            const newStock = prevStock + Number(adjustmentQty);
            
            await db.prepare(`UPDATE inventory_materials SET available_stock = ? WHERE id = ? AND business_id = ?`).run(newStock, materialId, businessId);
            
            await db.prepare(`
                INSERT INTO inventory_history (business_id, material_id, action_type, quantity, prev_stock, new_stock, reason, user_id, unit_rate, total_cost)
                VALUES (?, ?, 'Adjustment', ?, ?, ?, ?, ?, 0, 0)
            `).run(businessId, materialId, Number(adjustmentQty), prevStock, newStock, reason || 'Manual Adjustment', user?.id || 1);

            return NextResponse.json({ message: 'Stock adjusted' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Failed to update inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
