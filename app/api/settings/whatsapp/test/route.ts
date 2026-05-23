import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// Helper to check authentication
async function getAuthenticatedUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;
        return verifyToken(token);
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { admin_whatsapp, callmebot_api_key } = body;

        if (!admin_whatsapp || !callmebot_api_key) {
            return NextResponse.json({ error: 'Missing contact number or API key' }, { status: 400 });
        }

        const msg = "FabricOS test message: Your WhatsApp AP reminder notifications are successfully configured! ✓";
        const botUrl = `https://api.callmebot.com/whatsapp.php?phone=${admin_whatsapp}&text=${encodeURIComponent(msg)}&apikey=${callmebot_api_key}`;

        const res = await fetch(botUrl);

        if (res.ok) {
            return NextResponse.json({ success: true, message: 'Test message dispatched successfully' });
        } else {
            const text = await res.text();
            return NextResponse.json({ error: `CallMeBot API returned status ${res.status}: ${text}` }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Test whatsapp dispatch error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
