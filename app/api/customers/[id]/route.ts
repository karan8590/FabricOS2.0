import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { validateGSTIN } from '@/lib/gst';

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, error, status, user } = await checkPermission('customers.edit');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        const businessId = user?.businessId;

        const params = await context.params;
        const customerId = parseInt(params.id);
        const body = await request.json();
        const { name, phone, customer_type, gstin, state, state_code } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
        }

        const db = getDatabase();

        // Check if customer exists
        const customer = (await db.prepare('SELECT id FROM customers WHERE id = ? AND business_id = ?').get(customerId, businessId));
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Check for duplicate phone
        const existing = (await db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ? AND business_id = ?').get(phone, customerId, businessId));
        if (existing) {
            return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 });
        }

        // Validate GSTIN if customer is B2B and GSTIN is provided
        const cleanGstin = (gstin || '').trim().toUpperCase();
        if (customer_type === 'B2B' && cleanGstin) {
            const val = validateGSTIN(cleanGstin, state_code);
            if (!val.valid) {
                return NextResponse.json({ error: val.error }, { status: 400 });
            }
        }

        // Update database
        (await db.prepare(`
            UPDATE customers 
            SET name = ?, phone = ?, customer_type = ?, gstin = ?, state = ?, state_code = ?
            WHERE id = ? AND business_id = ?
        `).run(
                    name.trim(), 
                    phone.trim(), 
                    customer_type || 'B2C', 
                    customer_type === 'B2B' ? cleanGstin : null,
                    customer_type === 'B2B' ? state : null,
                    customer_type === 'B2B' ? state_code : null,
                    customerId,
                    businessId
                ));

        // Log activity
        (await db.prepare(`
            INSERT INTO activity (business_id, customer_id, type, title, description, meta)
            VALUES (?, ?, 'customer_updated', 'Customer Profile Updated', ?, ?)
        `).run(
                    businessId,
                    customerId,
                    `Customer profile details for "${name}" were updated`,
                    JSON.stringify({ customer_type, gstin: cleanGstin, state, state_code })
                ));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Customer PATCH error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
