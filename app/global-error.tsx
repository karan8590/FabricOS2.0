'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#fee', color: '#900', minHeight: '100vh' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Global Root Error!</h2>
                    <div style={{ background: '#fff', padding: '1rem', border: '1px solid #fcc', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        <strong>{error.name}: </strong> {error.message}
                        <br /><br />
                        {error.stack}
                    </div>
                </div>
            </body>
        </html>
    );
}
