'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import SearchModal from './SearchModal';
import styles from './GlobalSearch.module.css';

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Meta+K (Mac) or Ctrl+K (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

    return (
        <>
            <button 
                className={styles.searchTrigger} 
                onClick={() => setIsOpen(true)}
                title="Search anything (⌘K)"
            >
                <div className={styles.triggerLeft}>
                    <Search className={styles.searchIcon} />
                    <span>Search...</span>
                </div>
                <kbd className={styles.shortcutBadge}>
                    {isMac ? '⌘K' : 'Ctrl+K'}
                </kbd>
            </button>

            <SearchModal 
                isOpen={isOpen} 
                onClose={() => setIsOpen(false)} 
            />
        </>
    );
}
