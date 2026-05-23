'use client';

import styles from './ViewToggle.module.css';

interface ViewToggleProps {
    view: 'table' | 'cards';
    onChange: (view: 'table' | 'cards') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${view === 'table' ? styles.active : ''}`}
                onClick={() => onChange('table')}
            >
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <span>List</span>
            </button>
            <button
                className={`${styles.button} ${view === 'cards' ? styles.active : ''}`}
                onClick={() => onChange('cards')}
            >
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Grid</span>
            </button>
        </div>
    );
}
