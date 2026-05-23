import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tab = searchParams.get('tab') || 'fabric'; // 'fabric' | 'ink' | 'packaging'

        const { authorized, error, status, user } = await checkPermission('inventory.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId;

        const db = getDatabase();

        // 1. Always fetch all vendors and designs for dropdowns
        const vendors = (await db.prepare(`SELECT id, name, contact, city, gst_no FROM vendors WHERE business_id = ? ORDER BY name ASC`).all(businessId)) as any[];
        const designs = (await db.prepare(`SELECT id, name FROM designs WHERE business_id = ? ORDER BY name ASC`).all(businessId)) as any[];

        let data: any[] = [];

        if (tab === 'fabric') {
            data = (await db.prepare(`
                SELECT f.id, f.design_name as designName, f.vendor_id as vendorId, v.name as vendorName,
                       f.metres_ordered as metresOrdered, f.metres_received as metresReceived, 
                       f.metres_used as metresUsed, f.balance, f.purchase_cost as purchaseCost, 
                       f.rate_per_metre as ratePerMetre, f.linked_order_no as linkedOrderNo, 
                       f.purchase_date as purchaseDate, f.invoice_no as invoiceNo, f.notes
                FROM inventory_fabric f
                JOIN vendors v ON f.vendor_id = v.id
                WHERE f.business_id = ?
                ORDER BY f.purchase_date DESC, f.id DESC
            `).all(businessId)) as any[];
        } else if (tab === 'ink') {
            data = (await db.prepare(`
                SELECT id, ink_colour as inkColour, quantity, unit, supplier, 
                       purchase_date as purchaseDate, cost_per_unit as costPerUnit, 
                       current_balance as currentBalance, min_stock as minStock, last_alert_sent as lastAlertSent
                FROM inventory_ink
                WHERE business_id = ?
                ORDER BY purchase_date DESC, id DESC
            `).all(businessId)) as any[];
        } else if (tab === 'packaging') {
            data = (await db.prepare(`
                SELECT id, item_name as itemName, type, quantity, supplier, 
                       purchase_date as purchaseDate, cost, current_stock as currentStock, min_stock as minStock, last_alert_sent as lastAlertSent
                FROM inventory_packaging
                WHERE business_id = ?
                ORDER BY purchase_date DESC, id DESC
            `).all(businessId)) as any[];
        }

        return NextResponse.json({ data, vendors, designs });
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('inventory.view'); // Allow inventory access if they have permission
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId;

        const body = await request.json();
        const { action } = body;

        const db = getDatabase();

        // --- Vendor Master Sub-action ---
        if (action === 'add_vendor') {
            const { name, contact, city, gst_no } = body;
            if (!name || !contact) {
                return NextResponse.json({ error: 'Vendor Name and Phone (contact) are required' }, { status: 400 });
            }

            const info = (await db.prepare(`
                INSERT INTO vendors (business_id, name, contact, city, gst_no, material_supplied, balance)
                VALUES (?, ?, ?, ?, ?, 'Inventory Supplies', 0)
            `).run(businessId, name, contact, city || null, gst_no || null));

            const newVendor = {
                id: Number(info.lastInsertRowid),
                name,
                contact,
                city: city || null,
                gst_no: gst_no || null
            };

            return NextResponse.json({ message: 'Vendor added successfully', vendor: newVendor });
        }

        // --- FABRIC TAB ACTIONS ---
        if (action === 'add_fabric') {
            const { designName, vendorId, metresOrdered, metresReceived, ratePerMetre, linkedOrderNo, purchaseDate, invoiceNo, notes } = body;

            if (!designName || !vendorId || metresOrdered === undefined || metresReceived === undefined || !ratePerMetre || !purchaseDate) {
                return NextResponse.json({ error: 'Missing required fabric fields' }, { status: 400 });
            }

            const cost = Number(metresReceived) * Number(ratePerMetre);
            const balance = Number(metresReceived);

            (await db.prepare(`
                INSERT INTO inventory_fabric (business_id, design_name, vendor_id, metres_ordered, metres_received, metres_used, balance, purchase_cost, rate_per_metre, linked_order_no, purchase_date, invoice_no, notes)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
            `).run(businessId, designName, Number(vendorId), Number(metresOrdered), Number(metresReceived), balance, cost, Number(ratePerMetre), linkedOrderNo || null, purchaseDate, invoiceNo || null, notes || null));

            return NextResponse.json({ message: 'Fabric purchase logged successfully' });
        }

        if (action === 'edit_fabric') {
            const { id, designName, vendorId, metresOrdered, metresReceived, metresUsed, ratePerMetre, linkedOrderNo, purchaseDate, invoiceNo, notes } = body;

            if (!id || !designName || !vendorId || metresOrdered === undefined || metresReceived === undefined || metresUsed === undefined || !ratePerMetre || !purchaseDate) {
                return NextResponse.json({ error: 'Missing required fabric fields for edit' }, { status: 400 });
            }

            const cost = Number(metresReceived) * Number(ratePerMetre);
            const balance = Number(metresReceived) - Number(metresUsed);

            (await db.prepare(`
                UPDATE inventory_fabric
                SET design_name = ?, vendor_id = ?, metres_ordered = ?, metres_received = ?, metres_used = ?, balance = ?, purchase_cost = ?, rate_per_metre = ?, linked_order_no = ?, purchase_date = ?, invoice_no = ?, notes = ?
                WHERE id = ? AND business_id = ?
            `).run(designName, Number(vendorId), Number(metresOrdered), Number(metresReceived), Number(metresUsed), balance, cost, Number(ratePerMetre), linkedOrderNo || null, purchaseDate, invoiceNo || null, notes || null, id, businessId));

            return NextResponse.json({ message: 'Fabric purchase updated successfully' });
        }

        if (action === 'delete_fabric') {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

            (await db.prepare(`DELETE FROM inventory_fabric WHERE id = ? AND business_id = ?`).run(id, businessId));
            return NextResponse.json({ message: 'Fabric record deleted successfully' });
        }

        // --- INK TAB ACTIONS ---
        if (action === 'add_ink') {
            const { inkColour, quantity, unit, supplier, purchaseDate, costPerUnit } = body;

            if (!inkColour || !quantity || !unit || !supplier || !purchaseDate || !costPerUnit) {
                return NextResponse.json({ error: 'Missing required ink fields' }, { status: 400 });
            }

            (await db.prepare(`
                INSERT INTO inventory_ink (business_id, ink_colour, quantity, unit, supplier, purchase_date, cost_per_unit, current_balance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(businessId, inkColour, Number(quantity), unit, supplier, purchaseDate, Number(costPerUnit), Number(quantity)));

            return NextResponse.json({ message: 'Ink stock registered successfully' });
        }

        if (action === 'edit_ink') {
            const { id, inkColour, quantity, unit, supplier, purchaseDate, costPerUnit, currentBalance } = body;

            if (!id || !inkColour || !quantity || !unit || !supplier || !purchaseDate || !costPerUnit || currentBalance === undefined) {
                return NextResponse.json({ error: 'Missing required ink fields for edit' }, { status: 400 });
            }

            const existingInk = (await db.prepare(`SELECT min_stock, last_alert_sent, current_balance FROM inventory_ink WHERE id = ? AND business_id = ?`).get(id, businessId)) as any;

            (await db.prepare(`
                UPDATE inventory_ink
                SET ink_colour = ?, quantity = ?, unit = ?, supplier = ?, purchase_date = ?, cost_per_unit = ?, current_balance = ?
                WHERE id = ? AND business_id = ?
            `).run(inkColour, Number(quantity), unit, supplier, purchaseDate, Number(costPerUnit), Number(currentBalance), id, businessId));

            if (existingInk && existingInk.min_stock !== null && existingInk.min_stock !== undefined) {
                const min = Number(existingInk.min_stock);
                const cur = Number(currentBalance);
                const prev = Number(existingInk.current_balance);
                
                if (cur <= min && prev > min) {
                    const lastAlert = existingInk.last_alert_sent ? Number(existingInk.last_alert_sent) : 0;
                    const now = Math.floor(Date.now() / 1000);
                    if (now - lastAlert > 86400) { // 24 hours
                        sendTelegramMessage(`🚨 Stock Alert — FabricOS\n\n${inkColour} ink has dropped to ${cur}${unit}\nMinimum level: ${min}${unit}\n\nReorder soon to avoid production delays.`, 'inventory_alerts').catch(console.error);
                        await db.prepare(`UPDATE inventory_ink SET last_alert_sent = ? WHERE id = ? AND business_id = ?`).run(now, id, businessId);
                    }
                }
            }

            return NextResponse.json({ message: 'Ink stock updated successfully' });
        }

        if (action === 'delete_ink') {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

            (await db.prepare(`DELETE FROM inventory_ink WHERE id = ? AND business_id = ?`).run(id, businessId));
            return NextResponse.json({ message: 'Ink stock deleted successfully' });
        }

        if (action === 'update_min_stock_ink') {
            const { id, minStock } = body;
            if (!id || minStock === undefined) return NextResponse.json({ error: 'ID and minStock required' }, { status: 400 });

            await db.prepare(`UPDATE inventory_ink SET min_stock = ? WHERE id = ? AND business_id = ?`).run(Number(minStock), id, businessId);
            return NextResponse.json({ message: 'Minimum stock updated' });
        }

        // --- PACKAGING TAB ACTIONS ---
        if (action === 'add_packaging') {
            const { itemName, type, quantity, supplier, purchaseDate, cost } = body;

            if (!itemName || !type || !quantity || !supplier || !purchaseDate || !cost) {
                return NextResponse.json({ error: 'Missing required packaging fields' }, { status: 400 });
            }

            (await db.prepare(`
                INSERT INTO inventory_packaging (business_id, item_name, type, quantity, supplier, purchase_date, cost, current_stock)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(businessId, itemName, type, Number(quantity), supplier, purchaseDate, Number(cost), Number(quantity)));

            return NextResponse.json({ message: 'Packaging stock registered successfully' });
        }

        if (action === 'edit_packaging') {
            const { id, itemName, type, quantity, supplier, purchaseDate, cost, currentStock } = body;

            if (!id || !itemName || !type || !quantity || !supplier || !purchaseDate || !cost || currentStock === undefined) {
                return NextResponse.json({ error: 'Missing required packaging fields for edit' }, { status: 400 });
            }

            const existingPkg = (await db.prepare(`SELECT min_stock, last_alert_sent, current_stock FROM inventory_packaging WHERE id = ? AND business_id = ?`).get(id, businessId)) as any;

            (await db.prepare(`
                UPDATE inventory_packaging
                SET item_name = ?, type = ?, quantity = ?, supplier = ?, purchase_date = ?, cost = ?, current_stock = ?
                WHERE id = ? AND business_id = ?
            `).run(itemName, type, Number(quantity), supplier, purchaseDate, Number(cost), Number(currentStock), id, businessId));

            if (existingPkg && existingPkg.min_stock !== null && existingPkg.min_stock !== undefined) {
                const min = Number(existingPkg.min_stock);
                const cur = Number(currentStock);
                const prev = Number(existingPkg.current_stock);
                
                if (cur <= min && prev > min) {
                    const lastAlert = existingPkg.last_alert_sent ? Number(existingPkg.last_alert_sent) : 0;
                    const now = Math.floor(Date.now() / 1000);
                    if (now - lastAlert > 86400) {
                        sendTelegramMessage(`🚨 Stock Alert — FabricOS\n\nPackaging item '${itemName}' has dropped to ${cur} units\nMinimum level: ${min} units\n\nReorder soon to avoid production delays.`, 'inventory_alerts').catch(console.error);
                        await db.prepare(`UPDATE inventory_packaging SET last_alert_sent = ? WHERE id = ? AND business_id = ?`).run(now, id, businessId);
                    }
                }
            }

            return NextResponse.json({ message: 'Packaging stock updated successfully' });
        }

        if (action === 'delete_packaging') {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

            (await db.prepare(`DELETE FROM inventory_packaging WHERE id = ? AND business_id = ?`).run(id, businessId));
            return NextResponse.json({ message: 'Packaging stock deleted successfully' });
        }

        if (action === 'update_min_stock_packaging') {
            const { id, minStock } = body;
            if (!id || minStock === undefined) return NextResponse.json({ error: 'ID and minStock required' }, { status: 400 });

            await db.prepare(`UPDATE inventory_packaging SET min_stock = ? WHERE id = ? AND business_id = ?`).run(Number(minStock), id, businessId);
            return NextResponse.json({ message: 'Minimum stock updated' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Failed to update inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
