import { NextResponse } from 'next/server';
import { checkPermission } from '@/lib/auth/permissions';
import getDatabase from '@/lib/db';
import { validateGSTIN } from '@/lib/gst';

export async function GET(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('customers.view');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        
        const businessId = user?.businessId;

        const { searchParams } = new URL(request.url);
        const behaviorFilter = searchParams.get('behavior');
        const minLtv = searchParams.get('minLtv');
        const maxLtv = searchParams.get('maxLtv');
        const minOutstanding = searchParams.get('minOutstanding');
        const maxOutstanding = searchParams.get('maxOutstanding');
        const search = searchParams.get('search');

        const db = getDatabase();

        // Fetch basic customer info
        const customers = (await db.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY created_at DESC').all(businessId)) as any[];

        // Enhance with Intelligence Data
        let enhancedCustomers = customers.map(async (customer) => {
            // ... (keep existing enhancement logic)
            // 1. Order Stats
            const orderStats = (await db.prepare(`
                SELECT count(*) as count, max(created_at) as last_order 
                FROM orders 
                WHERE customer_id = ?
            `).get(customer.id)) as { count: number, last_order: number };

            // 2. Financials & Behavior
            const invoices = (await db.prepare(`
                SELECT amount, amount_paid, status, generated_at, due_date, paid_at 
                FROM invoices 
                WHERE customer_id = ?
            `).all(customer.id)) as any[];

            let totalInvoices = invoices.length;
            let ltv = 0; // Lifetime Value (Total Paid)
            let totalOverdueAmount = 0;
            let overdueInvoiceCount = 0;
            let totalDaysLate = 0;
            let maxDaysLate = 0;

            const now = Math.floor(Date.now() / 1000);
            const daySeconds = 86400;

            if (totalInvoices > 0) {
                invoices.forEach(inv => {
                    const paid = inv.amount_paid || 0;
                    ltv += paid;

                    const balance = Math.max(0, inv.amount - paid);
                    let daysLate = 0;

                    // Calculate Days Late
                    if (inv.status === 'paid' && inv.paid_at && inv.due_date) {
                        // Paid, check if late
                        if (inv.paid_at > inv.due_date) {
                            daysLate = (inv.paid_at - inv.due_date) / daySeconds;
                        }
                    } else if (inv.due_date && now > inv.due_date) {
                        // Unpaid/Partial and Overdue
                        daysLate = (now - inv.due_date) / daySeconds;
                        // Only count as overdue invoice if strictly overdue status or date passed
                        if (balance > 0) {
                            totalOverdueAmount += balance;
                            overdueInvoiceCount++;
                        }
                    }

                    if (daysLate > 0) {
                        totalDaysLate += daysLate;
                        if (daysLate > maxDaysLate) maxDaysLate = daysLate;
                    }
                });
            }

            const avgDaysLate = totalInvoices > 0 ? (totalDaysLate / totalInvoices) : 0;

            // 3. Risk Classification Rules
            let behavior = 'Reliable'; // Default

            // If no history, new/reliable
            if (totalInvoices === 0) {
                behavior = 'New';
            } else {
                // Rule 3: High Risk (Any true)
                const isHighRisk =
                    avgDaysLate > 20 ||
                    overdueInvoiceCount >= 2 ||
                    (ltv > 0 && (totalOverdueAmount / ltv) >= 0.40) ||
                    (ltv === 0 && totalOverdueAmount > 0) || // No payment ever + overdue
                    maxDaysLate > 45; // Any invoice > 45 days overdue

                // Rule 2: Slow Payer (Any true)
                const isSlowPayer =
                    (avgDaysLate >= 4 && avgDaysLate <= 20) ||
                    overdueInvoiceCount === 1 ||
                    (ltv > 0 && totalOverdueAmount > 0 && (totalOverdueAmount / ltv) < 0.25);

                if (isHighRisk) {
                    behavior = 'High Risk';
                } else if (isSlowPayer) {
                    behavior = 'Slow Payer';
                } else {
                    // Rule 1: Reliable (Implicit else, but verify constraints)
                    // avgDaysLate <= 3 && overdueInvoiceCount === 0 && totalOverdueAmount === 0
                    behavior = 'Reliable';
                }
            }

            return {
                ...customer,
                name: customer.name || customer.company_name || 'Unknown Customer',
                total_orders: orderStats ? orderStats.count : 0,
                last_order_date: orderStats ? orderStats.last_order : null,
                ltv,
                outstanding_amount: invoices.reduce((sum, inv) => sum + Math.max(0, inv.amount - (inv.amount_paid || 0)), 0),
                behavior,
                stats: {
                    avgDaysLate,
                    maxDaysLate,
                    overdueCount: overdueInvoiceCount
                }
            };
        });

        // Resolve all async enhancements
        let resolvedCustomers = await Promise.all(enhancedCustomers);

        // Apply filters on resolved data
        let filtered = resolvedCustomers;
        if (behaviorFilter) {
            filtered = filtered.filter(c => c.behavior === behaviorFilter);
        }
        if (minLtv) {
            filtered = filtered.filter(c => (c.ltv || 0) >= parseFloat(minLtv));
        }
        if (maxLtv) {
            filtered = filtered.filter(c => (c.ltv || 0) <= parseFloat(maxLtv));
        }
        if (minOutstanding) {
            filtered = filtered.filter(c => (c.outstanding_amount || 0) >= parseFloat(minOutstanding));
        }
        if (maxOutstanding) {
            filtered = filtered.filter(c => (c.outstanding_amount || 0) <= parseFloat(maxOutstanding));
        }
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name || '').toLowerCase().includes(s) ||
                (c.phone && c.phone.includes(s))
            );
        }

        return NextResponse.json({ customers: filtered });
    } catch (error) {
        console.error('Customers fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('customers.create');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }
        
        const businessId = user?.businessId;

        const body = await request.json();
        const { name, phone, email, address, gstNumber, notes, customer_type, gstin, state, state_code } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
        }

        const db = getDatabase();

        // Check for duplicate phone
        const existing = (await db.prepare('SELECT id FROM customers WHERE phone = ? AND business_id = ?').get(phone, businessId));
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

        const result = (await db.prepare(`
            INSERT INTO customers (name, phone, customer_type, gstin, state, state_code, business_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
                    name.trim(), 
                    phone.trim(), 
                    customer_type || 'B2C', 
                    customer_type === 'B2B' ? cleanGstin : null,
                    customer_type === 'B2B' ? state : null,
                    customer_type === 'B2B' ? state_code : null,
                    businessId
                ));

        // Log activity
        (await db.prepare(`
            INSERT INTO activity (business_id, customer_id, type, title, description, meta)
            VALUES (?, ?, 'customer_created', 'Customer Added', ?, ?)
        `).run(
                    businessId,
                    result.lastInsertRowid,
                    `New customer "${name}" was added to the system`,
                    JSON.stringify({ phone, email, address, gstNumber, notes, customer_type, gstin: cleanGstin, state, state_code })
                ));

        return NextResponse.json({ 
            success: true, 
            customerId: result.lastInsertRowid 
        });
    } catch (error: any) {
        console.error('Customer creation error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
