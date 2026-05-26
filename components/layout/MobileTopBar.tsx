'use client';

import { useState, useEffect } from 'react';
import { Scissors, Search } from 'lucide-react';
import SearchModal from './SearchModal';
import NotificationBell from './NotificationBell';
import styles from './MobileTopBar.module.css';
import { useAuth } from '@/contexts/AuthContext';

// Try to read firm name from localStorage (set by FirmSwitcher)
function useFirmName(): string {
    const [firmName, setFirmName] = useState('');
    
    useEffect(() => {
        const stored = localStorage.getItem('selectedFirmName') || 
                       localStorage.getItem('currentFirmName') || 
                       localStorage.getItem('firmName') || '';
        setFirmName(stored);

        // Watch for changes in case FirmSwitcher updates it
        const handler = () => {
            const updated = localStorage.getItem('selectedFirmName') || 
                            localStorage.getItem('currentFirmName') || 
                            localStorage.getItem('firmName') || '';
            setFirmName(updated);
        };
        window.addEventListener('storage', handler);
        // Also poll every 2s for same-window updates
        const interval = setInterval(handler, 2000);
        return () => {
            window.removeEventListener('storage', handler);
            clearInterval(interval);
        };
    }, []);

    return firmName;
}

export default function MobileTopBar() {
    const [searchOpen, setSearchOpen] = useState(false);
    const { user } = useAuth();
    const firmName = useFirmName();

    if (!user) return null;

    return (
        <>
            <div className={styles.topBar}>
                {/* Brand */}
                <div className={styles.brand}>
                    <div className={styles.logoBox}>
                        <Scissors size={16} color="#FFFFFF" strokeWidth={2.2} />
                    </div>
                    <div className={styles.brandText}>
                        <span className={styles.appName}>FabricOS</span>
                        {firmName && (
                            <span className={styles.firmName}>{firmName}</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setSearchOpen(true)}
                        aria-label="Search"
                    >
                        <Search size={20} />
                    </button>
                    <NotificationBell />
                </div>
            </div>

            <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
}
