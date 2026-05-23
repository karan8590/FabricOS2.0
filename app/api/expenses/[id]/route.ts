import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';
import { validateGSTIN, calculateGST } from '@/lib/gst';

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const expenseId = parseInt(params.id);
        const { 
            date, category, description, amount, paymentMode, reference, notes, type, customerName,
            has_gst, supplier_gstin, invoice_no, gst_rate, itc_claimed
        } = await request.json();

        const db = getDatabase();

        // Check if the expense is auto-populated
        const existing = (await db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId)) as any;
        if (!existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (existing.isAuto === 1) {
            return NextResponse.json({ error: 'Cannot edit auto-populated expenses' }, { status: 400 });
        }

        const dateTimestamp = typeof date === 'number' ? date : Math.floor(new Date(date).getTime() / 1000);

        let calculatedHasGst = has_gst ? 1 : 0;
        let calculatedSupplierGstin = null;
        let calculatedInvoiceNo = null;
        let calculatedTaxableAmount = amount;
        let calculatedGstRate = 0;
        let calculatedGstAmount = 0;
        let calculatedGstType = 'NONE';
        let calculatedItcClaimed = 0;

        if (calculatedHasGst && (type || existing.type || 'out') === 'out') {
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

        (await db.prepare(`
            UPDATE expenses 
            SET date = ?, category = ?, description = ?, amount = ?, paymentMode = ?, reference = ?, notes = ?, type = ?, customerName = ?,
                has_gst = ?, supplier_gstin = ?, invoice_no = ?, taxable_amount = ?, gst_rate = ?, gst_amount = ?, gst_type = ?, itc_claimed = ?
            WHERE id = ?
        `).run(
                    dateTimestamp, 
                    category, 
                    description, 
                    amount, 
                    paymentMode, 
                    reference, 
                    notes, 
                    type || 'out', 
                    customerName || null,
                    calculatedHasGst,
                    calculatedSupplierGstin,
                    calculatedInvoiceNo,
                    calculatedTaxableAmount,
                    calculatedGstRate,
                    calculatedGstAmount,
                    calculatedGstType,
                    calculatedItcClaimed,
                    expenseId
                ));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Expense update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const params = await context.params;
        const expenseId = parseInt(params.id);

        const db = getDatabase();

        // Check if the expense is auto-populated
        const existing = (await db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId)) as any;
        if (!existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (existing.isAuto === 1) {
            return NextResponse.json({ error: 'Cannot delete auto-populated expenses' }, { status: 400 });
        }

        (await db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Expense delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
