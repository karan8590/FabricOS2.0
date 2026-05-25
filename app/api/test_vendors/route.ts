import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';

export async function GET(request: Request) {
    try {
        const db = getDatabase();
        const mats = await db.prepare('SELECT * FROM inventory_materials').all();
        return NextResponse.json({ mats });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
