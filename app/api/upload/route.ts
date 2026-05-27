import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Accepts a multipart form with a single `file` field.
// Attempts Supabase Storage first; falls back to a base64 data-URL for
// environments where storage isn't configured yet.
export async function POST(request: Request) {
    try {
        // Auth check
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF images are allowed' }, { status: 400 });
        }
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // ── Try Supabase Storage ─────────────────────────────────────────────
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const ext = file.name.split('.').pop() || 'jpg';
            const fileName = `catalog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const uploadRes = await fetch(
                `${supabaseUrl}/storage/v1/object/fabricos-assets/${fileName}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': file.type,
                        'x-upsert': 'true',
                    },
                    body: buffer,
                }
            );

            if (uploadRes.ok) {
                const publicUrl = `${supabaseUrl}/storage/v1/object/public/fabricos-assets/${fileName}`;
                return NextResponse.json({ url: publicUrl });
            }
            // Fall through to base64 if upload failed
            console.warn('[Upload] Supabase Storage upload failed, falling back to base64');
        }

        // ── Fallback: base64 data-URL ─────────────────────────────────────────
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;
        return NextResponse.json({ url: dataUrl, fallback: true });

    } catch (error) {
        console.error('[Upload API]', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
