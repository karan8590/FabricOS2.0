import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { validateGSTIN, calculateGST } from '@/lib/gst';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role === 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = payload.businessId;

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month'); // e.g. "5" or "all"
        const legacyMonth = searchParams.get('month_legacy');
        const search = searchParams.get('search');
        const type = searchParams.get('type');
        
        let startTimestamp = 0;
        let endTimestamp = 9999999999;
        let applyDateFilter = false;

        if (yearParam && yearParam !== 'all' && yearParam !== 'All Years') {
            const year = parseInt(yearParam);
            if (monthParam && monthParam !== 'all' && monthParam !== 'All Months') {
                const monthNum = parseInt(monthParam);
                const startOfMonth = new Date(year, monthNum - 1, 1);
                const endOfMonth = new Date(year, monthNum, 0);
                startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
                endTimestamp = Math.floor(endOfMonth.getTime() / 1000) + 86399;
            } else {
                const startOfYear = new Date(year, 0, 1);
                const endOfYear = new Date(year, 11, 31);
                startTimestamp = Math.floor(startOfYear.getTime() / 1000);
                endTimestamp = Math.floor(endOfYear.getTime() / 1000) + 86399;
            }
            applyDateFilter = true;
        } else if (legacyMonth) {
            const [year, monthNum] = legacyMonth.split('-');
            const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0);
            startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
            endTimestamp = Math.floor(endOfMonth.getTime() / 1000) + 86399;
            applyDateFilter = true;
        }

        const db = getDatabase();
        let query = `
            SELECT e.*, u.name AS addedByName 
            FROM expenses e 
            LEFT JOIN users u ON COALESCE(e.addedBy, e.created_by_user_id) = u.id 
            WHERE COALESCE(e.is_deleted, false) = false AND e.business_id = ?
        `;
        const params: any[] = [businessId];

        // Filter by type
        if (type && type !== 'all' && type !== 'All') {
            query += ' AND COALESCE(e.type, \'out\') = ?';
            params.push(type);
        }

        // Filter by category
        if (category && category !== 'all' && category !== 'All' && category !== 'all_categories') {
            query += ' AND e.category = ?';
            params.push(category);
        }

        // Filter by date
        if (applyDateFilter) {
            query += ' AND e.date >= ? AND e.date <= ?';
            params.push(startTimestamp, endTimestamp);
        }

        // Search text
        if (search) {
            query += ' AND (e.category LIKE ? OR e.description LIKE ? OR e.notes LIKE ? OR e.customerName LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY e.date DESC, e.id DESC';

        const expenses = (await db.prepare(query).all(...params));

        // Statistics use the same startTimestamp and endTimestamp
        // If not filtering by date, what stats to show? Probably all time or current month?
        // Let's default to current month for stats if no date filter is applied, or maybe all time?
        // User is viewing "All Years", so stats should be all time. Let's use the actual applied timestamps.

        // 1. Total Cash In
        const totalCashInRow = (await db.prepare(`
            SELECT SUM(amount) AS val 
            FROM expenses 
            WHERE type = 'in' AND date >= ? AND date <= ? AND business_id = ? AND COALESCE(is_deleted, false) = false
        `).get(startTimestamp, endTimestamp, businessId)) as any;
        const totalCashIn = totalCashInRow?.val || 0;

        // 2. Total Cash Out
        const totalCashOutRow = (await db.prepare(`
            SELECT SUM(amount) AS val 
            FROM expenses 
            WHERE COALESCE(type, 'out') = 'out' AND date >= ? AND date <= ? AND business_id = ? AND COALESCE(is_deleted, false) = false
        `).get(startTimestamp, endTimestamp, businessId)) as any;
        const totalCashOut = totalCashOutRow?.val || 0;

        // 3. Staff costs this month (Staff Salary + Staff Advance)
        const staffCostsRow = (await db.prepare(`
            SELECT SUM(amount) AS val 
            FROM expenses 
            WHERE category IN ('Staff Salary', 'Staff Advance') AND COALESCE(type, 'out') = 'out' AND date >= ? AND date <= ? AND business_id = ? AND COALESCE(is_deleted, false) = false
        `).get(startTimestamp, endTimestamp, businessId)) as any;
        const staffCosts = staffCostsRow?.val || 0;

        // Retain standard parameters for backward compatibility
        const outstandingAdvancesRow = (await db.prepare(`
            SELECT SUM(remaining_balance) AS val 
            FROM employee_advances 
            WHERE status = 'active' AND business_id = ?
        `).get(businessId)) as any;
        const outstandingAdvances = outstandingAdvancesRow?.val || 0;

        return NextResponse.json({ 
            expenses,
            stats: {
                totalCashIn,
                totalCashOut,
                staffCosts,
                outstandingAdvances,
                // Keep backward compatibility values:
                totalExpenses: totalCashOut,
                staffSalaries: staffCosts,
                otherExpenses: totalCashOut - staffCosts
            }
        });
    } catch (error) {
        console.error('Expenses fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role === 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const businessId = payload.businessId;

        const { 
            date, category, description, amount, paymentMode, reference, notes, type, customerName,
            has_gst, supplier_gstin, invoice_no, gst_rate, itc_claimed
        } = await request.json();

        if (!category || amount === undefined || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        const dateTimestamp = typeof date === 'number' ? date : Math.floor(new Date(date).getTime() / 1000);
        const createdAtTimestamp = Math.floor(Date.now() / 1000);

        let calculatedHasGst = has_gst ? 1 : 0;
        let calculatedSupplierGstin = null;
        let calculatedInvoiceNo = null;
        let calculatedTaxableAmount = amount;
        let calculatedGstRate = 0;
        let calculatedGstAmount = 0;
        let calculatedGstType = 'NONE';
        let calculatedItcClaimed = 0;

        if (calculatedHasGst && (type || 'out') === 'out') {
            if (!supplier_gstin) {
                return NextResponse.json({ error: 'Supplier GSTIN is required when GST is enabled' }, { status: 400 });
            }
            const cleanGstin = supplier_gstin.trim().toUpperCase();
            const { valid, error: validationError } = validateGSTIN(cleanGstin);
            if (!valid) {
                return NextResponse.json({ error: validationError }, { status: 400 });
            }

            calculatedSupplierGstin = cleanGstin;
            calculatedInvoiceNo = invoice_no ? invoice_no.trim() : null;
            calculatedGstRate = gst_rate !== undefined ? parseFloat(gst_rate) : 5;
            calculatedItcClaimed = itc_claimed ? 1 : 0;

            const supplierStateCode = cleanGstin.substring(0, 2);
            const gstRow = (await db.prepare("SELECT value FROM settings WHERE key = 'gst'").get()) as { value: string } | undefined;
            const gstConfig = gstRow ? JSON.parse(gstRow.value) : null;
            const sellerStateCode = gstConfig?.stateCode || '24';

            const gstRes = calculateGST({
                amount: amount,
                rate: calculatedGstRate,
                stateCode: supplierStateCode,
                isB2B: true,
                isInclusive: true
            });

            calculatedTaxableAmount = parseFloat(gstRes.taxableAmount.toFixed(2));
            calculatedGstAmount = parseFloat(gstRes.gstAmount.toFixed(2));
            calculatedGstType = supplierStateCode === sellerStateCode ? 'CGST_SGST' : 'IGST';
        }

        const result = (await db
                    .prepare(`
                INSERT INTO expenses (
                    business_id, category, amount, date, description, paymentMode, reference, notes, 
                    addedBy, created_by_user_id, isAuto, linkedId, created_at, type, customerName,
                    has_gst, supplier_gstin, invoice_no, taxable_amount, gst_rate, gst_amount, gst_type, itc_claimed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
                    .run(
                        businessId,
                        category,
                        amount,
                        dateTimestamp,
                        description || '',
                        paymentMode || 'Cash',
                        reference || '',
                        notes || '',
                        payload.userId,
                        payload.userId,
                        createdAtTimestamp,
                        type || 'out',
                        customerName || null,
                        calculatedHasGst,
                        calculatedSupplierGstin,
                        calculatedInvoiceNo,
                        calculatedTaxableAmount,
                        calculatedGstRate,
                        calculatedGstAmount,
                        calculatedGstType,
                        calculatedItcClaimed
                    ));

        const expenseId = result.lastInsertRowid;

        // Trigger Telegram Automation
        try {
            const userRow = (await db.prepare('SELECT name FROM users WHERE id = ?').get(payload.userId)) as any;
            const addedByName = userRow?.name || 'Admin';

            let gstText = '';
            if (calculatedHasGst) {
                gstText = `\n*GST*: ${calculatedGstType} (${calculatedGstRate}%)\n*Taxable Amt*: ₹${calculatedTaxableAmount.toLocaleString('en-IN')}\n*GST Amt*: ₹${calculatedGstAmount.toLocaleString('en-IN')}\n*ITC Claimed*: ${calculatedItcClaimed ? 'Yes' : 'No'}`;
            }

            const payloadText = {
                english: `📝 *FabricOS — Expense Logged*\n\nNew expense recorded.\n*Category*: ${category}\n*Amount*: ₹${amount.toLocaleString('en-IN')}${gstText}\n*Logged by*: ${addedByName}\n*Notes*: ${description || notes || 'None'}\n*Linked ID*: EXP-${expenseId}`,
                gujarati: `📝 *FabricOS — ખર્ચ નોંધાયો*\n\nનવો ખર્ચ નોંધવામાં આવ્યો છે.\n*કેટેગરી*: ${category}\n*રકમ*: ₹${amount.toLocaleString('en-IN')}${gstText}\n*દ્વારા નોંધાયેલ*: ${addedByName}\n*નોંધ*: ${description || notes || 'કોઈ નહિ'}\n*લિંક કરેલ ID*: EXP-${expenseId}`
            };
            
            // Do not await to avoid blocking the HTTP response
            sendTelegramMessage(payloadText, 'expense_alerts').catch(console.error);
        } catch (tgErr) {
            console.error('Telegram dispatch error for expense:', tgErr);
        }

        return NextResponse.json({ success: true, expenseId });
    } catch (error) {
        console.error('Expense creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
