import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view'); // You might want a specific challans.view permission later
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const challanStatus = searchParams.get('status');
        const searchQuery = searchParams.get('search');
        
        const db = getDatabase();
        let query = `SELECT * FROM challans WHERE business_id = ?`;
        const params: any[] = [businessId];

        if (type && type !== 'all') {
            query += ` AND challan_type = ?`;
            params.push(type);
        }

        if (challanStatus && challanStatus !== 'all') {
            query += ` AND status = ?`;
            params.push(challanStatus);
        }
        
        if (searchQuery) {
            query += ` AND (challan_number LIKE ? OR to_name LIKE ? OR order_number LIKE ?)`;
            const likeQuery = `%${searchQuery}%`;
            params.push(likeQuery, likeQuery, likeQuery);
        }

        query += ` ORDER BY created_at DESC`;

        const rawChallans = (await db.prepare(query).all(...params)) as any[];
        
        const challans = rawChallans.map(c => ({
            ...c,
            items: c.items ? JSON.parse(c.items) : []
        }));

        return NextResponse.json({ challans });
    } catch (error) {
        console.error('Challans fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { authorized, user, error, status } = await checkPermission('orders.create');
        if (!authorized) {
            return NextResponse.json({ error }, { status });
        }

        const businessId = await getActiveBusinessId();
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });
        }

        const body = await request.json();
        const {
            challan_type, date, order_id, order_number,
            from_name, from_address, from_gstin,
            to_name, to_address, to_gstin,
            purpose, items, vehicle_number, transporter,
            expected_return_date, linked_job_work_id
        } = body;

        if (!challan_type || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        
        // Generate Challan Number
        const prefix = challan_type === 'jobwork' ? 'JW' : (challan_type === 'sample' ? 'SC' : 'DC');
        const dateObj = new Date(date);
        const yearMonth = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        const latestChallan = (await db.prepare(`
            SELECT challan_number FROM challans 
            WHERE challan_number LIKE ? AND business_id = ?
            ORDER BY challan_number DESC 
            LIMIT 1
        `).get(`${prefix}-${yearMonth}-%`, businessId)) as any;

        let nextSequence = 1;
        if (latestChallan && latestChallan.challan_number) {
            const parts = latestChallan.challan_number.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) {
                    nextSequence = lastSeq + 1;
                }
            }
        }
        
        const challanNumber = `${prefix}-${yearMonth}-${String(nextSequence).padStart(3, '0')}`;
        
        // Calculate totals
        const itemsList = items || [];
        const totalQuantity = itemsList.reduce((sum: number, item: any) => sum + (parseFloat(item.quantity) || 0), 0);
        const totalValue = itemsList.reduce((sum: number, item: any) => sum + (parseFloat(item.value) || 0), 0);

        const result = (await db.prepare(`
            INSERT INTO challans (
                business_id, challan_number, challan_type, date,
                order_id, order_number, from_name, from_address, from_gstin,
                to_name, to_address, to_gstin, purpose, items,
                total_quantity, total_value, vehicle_number, transporter,
                expected_return_date, status, linked_job_work_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
        `).run(
                    businessId, challanNumber, challan_type, date,
                    order_id || null, order_number || null,
                    from_name || null, from_address || null, from_gstin || null,
                    to_name || null, to_address || null, to_gstin || null,
                    purpose || null, JSON.stringify(itemsList),
                    totalQuantity, totalValue,
                    vehicle_number || null, transporter || null,
                    expected_return_date || null,
                    linked_job_work_id || null, user?.name || 'System'
                ));

        return NextResponse.json({
            success: true,
            challanId: result.lastInsertRowid,
            challanNumber
        });
    } catch (error) {
        console.error('Challan creation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
