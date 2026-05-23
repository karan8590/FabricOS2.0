// Firestore real-time listener emulation for SQLite backend compatibility

export interface MockDocumentSnapshot {
    id: string;
    data: () => any;
}

export interface MockQuerySnapshot {
    docs: MockDocumentSnapshot[];
    empty: boolean;
    size: number;
}

export const db = {
    type: 'sqlite-emulated-firestore'
};

export function collection(database: any, collectionPath: string) {
    return {
        type: 'collection',
        path: collectionPath
    };
}

export function query(colRef: any, ...queryConstraints: any[]) {
    return {
        type: 'query',
        colRef,
        constraints: queryConstraints
    };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return {
        type: 'orderBy',
        field,
        direction
    };
}

export function limit(n: number) {
    return {
        type: 'limit',
        value: n
    };
}

// Global active subscriptions map for active cleanup and performance
const activeListeners = new Map<string, number>();

export function onSnapshot(
    q: any,
    onNext: (snapshot: MockQuerySnapshot) => void,
    onError?: (error: any) => void
): () => void {
    let active = true;
    let timerId: NodeJS.Timeout | null = null;
    let lastFetchedJson = '';

    const poll = async () => {
        if (!active) return;
        try {
            const res = await fetch('/api/notifications');
            if (!res.ok) {
                throw new Error(`Failed to fetch notifications: ${res.statusText}`);
            }
            const data = await res.json();
            
            // Format to match expected 20 notifications limit
            const rawNotifications = data.notifications || [];
            const limitedNotifications = rawNotifications.slice(0, 20);

            // Structure to map exactly to Firestore entities
            const formattedNotifs = limitedNotifications.map((n: any) => ({
                id: String(n.id),
                type: n.type,
                title: n.title,
                message: n.message,
                entityType: n.type.split('_')[0],
                entityId: n.meta?.orderId || n.meta?.invoiceId || '',
                createdAt: n.created_at, // unix timestamp
                createdBy: 'system',
                isRead: n.is_read === 1,
                priority: n.type === 'invoice_overdue' ? 'high' : 'medium',
                metadata: n.meta || {}
            }));

            const currentJson = JSON.stringify(formattedNotifs);

            // Only trigger callback on state change to avoid redundant rendering cycles
            if (currentJson !== lastFetchedJson) {
                lastFetchedJson = currentJson;

                const docs: MockDocumentSnapshot[] = formattedNotifs.map((notif: any) => ({
                    id: notif.id,
                    data: () => notif
                }));

                onNext({
                    docs,
                    empty: docs.length === 0,
                    size: docs.length
                });
            }
        } catch (err) {
            console.error('onSnapshot live listener error:', err);
            if (onError) onError(err);
        } finally {
            if (active) {
                // Poll every 3 seconds for extremely fast, responsive real-time updates
                timerId = setTimeout(poll, 3000);
            }
        }
    };

    // Trigger initial fetch
    poll();

    // Return the unsubscribe/cleanup handler
    return () => {
        active = false;
        if (timerId) clearTimeout(timerId);
    };
}
