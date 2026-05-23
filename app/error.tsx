'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to the console
        console.error('Next.js Global App Error:', error);
    }, [error]);

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#fee', color: '#900', minHeight: '100vh' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong!</h2>
            <div style={{ background: '#fff', padding: '1rem', border: '1px solid #fcc', borderRadius: '4px', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                <strong>{error.name}: </strong> {error.message}
                <br />
                <br />
                {error.stack}
            </div>
            <button
                onClick={() => reset()}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#900', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
                Try again
            </button>
        </div>
    );
}
