import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import getDatabase from '@/lib/db';

async function getAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload || payload.role === 'customer') return null;
    return payload;
}

export async function DELETE(request: Request, context: any) {
    const params = await Promise.resolve(context.params);
    const sheetId = params.id;

    if (!sheetId) {
        return NextResponse.json({ error: 'Sheet ID is required' }, { status: 400 });
    }

    try {
        const payload = await getAuth();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = getDatabase();

        // Ensure master sheet belongs to business
        const checkSheet = await db.query(
            'SELECT id FROM design_master_sheets WHERE id = $1 AND business_id = $2',
            [sheetId, payload.businessId]
        );

        if (checkSheet.rows.length === 0) {
            return NextResponse.json({ error: 'Master sheet not found' }, { status: 404 });
        }

        // Delete the master sheet. The ON DELETE CASCADE constraint will automatically
        // delete all catalog_variants associated with this master_sheet_id.
        await db.query('DELETE FROM design_master_sheets WHERE id = $1', [sheetId]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Master Sheets DELETE]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
