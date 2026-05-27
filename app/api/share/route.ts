import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';

export async function GET(request: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.view'); // general view permission
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const id = searchParams.get('id');

        if (!type || !id) {
            return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        
        // Sign sharing token
        const shareToken = jwt.sign(
            { type, targetId: id, businessId },
            JWT_SECRET,
            { expiresIn: '365d' }
        );

        const origin = new URL(request.url).origin;
        let publicUrl = '';

        if (type === 'invoice') {
            publicUrl = `${origin}/api/public/invoices/${id}/pdf?token=${shareToken}`;
        } else if (type === 'challan') {
            publicUrl = `${origin}/api/public/challan/${id}/pdf?token=${shareToken}`;
        } else if (type === 'ledger') {
            publicUrl = `${origin}/public/ledger/${id}?token=${shareToken}`;
        } else {
            return NextResponse.json({ error: 'Invalid share type' }, { status: 400 });
        }

        return NextResponse.json({ url: publicUrl, token: shareToken });

    } catch (err: any) {
        console.error('Share link generation error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
