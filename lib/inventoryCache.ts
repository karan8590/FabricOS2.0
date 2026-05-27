import { useState, useEffect } from 'react';
import { getAvailableInventory } from './inventory';

// In-memory cache for fabric inventory
let inventoryCache: Record<string, number> | null = null;
let fetchPromise: Promise<void> | null = null;
let listeners: Array<() => void> = [];

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

/**
 * Triggers a background fetch of the fabric inventory and caches it in memory.
 * If a fetch is already in flight, or if we already have cache (and forceRefresh is false),
 * it does nothing.
 */
export const prefetchFabricInventory = (forceRefresh = false) => {
    if ((inventoryCache && !forceRefresh) || fetchPromise) return;

    fetchPromise = fetch('/api/inventory?category=Fabric')
        .then(res => res.json())
        .then(data => {
            const newCache: Record<string, number> = {};
            if (data.data) {
                data.data.forEach((m: any) => {
                    const avail = getAvailableInventory(m);
                    newCache[m.name] = (newCache[m.name] || 0) + avail;
                });
            }
            inventoryCache = newCache;
            notifyListeners();
        })
        .catch(err => {
            console.error('Failed to prefetch inventory', err);
        })
        .finally(() => {
            fetchPromise = null;
        });
};

/**
 * Custom hook to consume the cached inventory for a specific fabric.
 * Automatically triggers a prefetch if cache is empty.
 * Updates instantly when cache updates.
 */
export const useFabricInventory = (fabricName: string) => {
    const [available, setAvailable] = useState<number | null>(
        inventoryCache ? (inventoryCache[fabricName] || 0) : null
    );

    useEffect(() => {
        const handleCacheUpdate = () => {
            if (inventoryCache) {
                setAvailable(inventoryCache[fabricName] || 0);
            }
        };

        listeners.push(handleCacheUpdate);

        // Initiate fetch if we don't have data yet
        if (!inventoryCache && !fetchPromise) {
            prefetchFabricInventory();
        } else if (inventoryCache) {
            // Instantly sync in case cache populated right before effect mounted
            setAvailable(inventoryCache[fabricName] || 0);
        }

        return () => {
            listeners = listeners.filter(l => l !== handleCacheUpdate);
        };
    }, [fabricName]);

    return {
        available,
        isLoading: available === null
    };
};
