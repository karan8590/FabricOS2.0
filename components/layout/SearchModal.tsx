'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { 
    Search, X, Loader2, ClipboardList, Users, Store, 
    FileText, FileSpreadsheet, UserCheck, Layers, Truck,
    CornerDownLeft, History
} from 'lucide-react';
import styles from './SearchModal.module.css';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [mounted, setMounted] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        // Load recent searches from localStorage
        const saved = localStorage.getItem('f_recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            document.body.style.overflow = 'unset';
            setQuery('');
            setDebouncedQuery('');
            setResults({});
            setActiveIndex(0);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Query debouncing (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Live search fetch
    useEffect(() => {
        if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
            setResults({});
            setLoading(false);
            return;
        }

        const executeSearch = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results || {});
                }
            } catch (err) {
                console.error('Search request error:', err);
            } finally {
                setLoading(false);
                setActiveIndex(0); // Reset index on new search
            }
        };

        executeSearch();
    }, [debouncedQuery]);

    // Flatten results or recent searches for keyboard navigation
    const flatItems = useMemo(() => {
        if (!query.trim()) {
            return recentSearches;
        }
        
        const list: any[] = [];
        const modules = ['orders', 'customers', 'vendors', 'invoices', 'challans', 'employees', 'catalog', 'dispatches'];
        modules.forEach(m => {
            const items = results[m] || [];
            items.forEach(item => {
                list.push({ ...item, module: m });
            });
        });
        return list;
    }, [query, results, recentSearches]);

    // Handle keydown navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (flatItems.length ? (prev + 1) % flatItems.length : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (flatItems.length ? (prev - 1 + flatItems.length) % flatItems.length : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatItems.length && flatItems[activeIndex]) {
                    handleSelectItem(flatItems[activeIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, flatItems, activeIndex]);

    // Scroll active item into view
    useEffect(() => {
        const container = resultsContainerRef.current;
        if (!container) return;

        const activeEl = container.querySelector(`[data-index="${activeIndex}"]`);
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    const handleSelectItem = (item: any) => {
        // Save to recent searches (limit 5)
        const record = { ...item };
        // Ensure module property is preserved
        if (!record.module && item.challan_type) record.module = 'challans'; 
        
        setRecentSearches(prev => {
            const filtered = prev.filter(p => !(p.id === record.id && p.module === record.module));
            const updated = [record, ...filtered].slice(0, 5);
            localStorage.setItem('f_recent_searches', JSON.stringify(updated));
            return updated;
        });

        // Navigate
        onClose();
        const module = record.module || '';
        if (module === 'orders') {
            router.push(`/orders/${record.id}`);
        } else if (module === 'customers') {
            router.push(`/customers/${record.id}`);
        } else if (module === 'vendors') {
            router.push(`/vendors?search=${encodeURIComponent(record.name)}`);
        } else if (module === 'invoices') {
            router.push(`/invoices?search=${encodeURIComponent(record.invoice_number)}`);
        } else if (module === 'challans') {
            router.push(`/challans?search=${encodeURIComponent(record.challan_number)}`);
        } else if (module === 'employees') {
            router.push(`/employees?search=${encodeURIComponent(record.name)}`);
        } else if (module === 'catalog') {
            router.push(`/catalog?search=${encodeURIComponent(record.name)}`);
        } else if (module === 'dispatches') {
            router.push(`/challans?search=${encodeURIComponent(record.dispatch_number)}`);
        }
    };

    // Helper functions for metadata presentation
    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'orders': return <ClipboardList className={styles.itemIcon} />;
            case 'customers': return <Users className={styles.itemIcon} />;
            case 'vendors': return <Store className={styles.itemIcon} />;
            case 'invoices': return <FileText className={styles.itemIcon} />;
            case 'challans': return <FileSpreadsheet className={styles.itemIcon} />;
            case 'employees': return <UserCheck className={styles.itemIcon} />;
            case 'catalog': return <Layers className={styles.itemIcon} />;
            case 'dispatches': return <Truck className={styles.itemIcon} />;
            default: return <Search className={styles.itemIcon} />;
        }
    };

    const getModuleTitle = (module: string, item: any) => {
        switch (module) {
            case 'orders': return `Order #${item.order_number || item.id}`;
            case 'customers': return item.name;
            case 'vendors': return item.name;
            case 'invoices': return `Invoice #${item.invoice_number}`;
            case 'challans': return `Challan #${item.challan_number}`;
            case 'employees': return item.name;
            case 'catalog': return item.name;
            case 'dispatches': return `Dispatch #${item.dispatch_number}`;
            default: return 'Search Record';
        }
    };

    const getModuleSubtitle = (module: string, item: any) => {
        switch (module) {
            case 'orders': 
                return `Customer: ${item.customer_name} • ${item.quantity_meters}m • ₹${Number(item.total_price).toLocaleString('en-IN')}`;
            case 'customers': 
                return `GST: ${item.gstin || 'No GST'} • Phone: ${item.phone} • Balance: ₹${Number(item.outstanding_amount).toLocaleString('en-IN')}`;
            case 'vendors': 
                return `Type: ${item.vendor_type || 'Fabric Supplier'} • Phone: ${item.phone} • Balance: ₹${Number(item.balance).toLocaleString('en-IN')}`;
            case 'invoices': 
                return `Customer: ${item.customer_name} • Amount: ₹${Number(item.amount).toLocaleString('en-IN')}`;
            case 'challans': 
                return `Type: ${item.challan_type} • Transporter: ${item.transporter} • Vehicle: ${item.vehicle_number}`;
            case 'employees': 
                return `Role: ${item.role} • Phone: ${item.phone}`;
            case 'catalog': 
                return `Category: ${item.category} • Rate: ₹${item.price_per_meter}/m`;
            case 'dispatches': 
                return `Route: ${item.route || 'Local'} • Driver: ${item.driver_name || 'N/A'} • Vehicle: ${item.vehicle_number}`;
            default: 
                return 'FabricOS operational record';
        }
    };

    const getModuleBadge = (module: string, item: any) => {
        let text = '';
        let styleObj = {};

        const status = item.status || '';
        
        if (module === 'orders') {
            text = item.order_stage || status || 'Pending';
            if (text === 'delivered') {
                styleObj = { background: 'var(--badge-paid-bg)', color: 'var(--badge-paid-text)', borderColor: 'var(--badge-paid-border)' };
            } else {
                styleObj = { background: 'var(--badge-production-bg)', color: 'var(--badge-production-text)', borderColor: 'var(--badge-production-border)' };
            }
        } else if (module === 'invoices') {
            text = status;
            if (status === 'paid') {
                styleObj = { background: 'var(--badge-paid-bg)', color: 'var(--badge-paid-text)', borderColor: 'var(--badge-paid-border)' };
            } else if (status === 'partial') {
                styleObj = { background: 'var(--badge-partial-bg)', color: 'var(--badge-partial-text)', borderColor: 'var(--badge-partial-border)' };
            } else {
                styleObj = { background: 'var(--badge-unpaid-bg)', color: 'var(--badge-unpaid-text)', borderColor: 'var(--badge-unpaid-border)' };
            }
        } else if (module === 'challans') {
            text = status || 'Open';
            if (status === 'closed') {
                styleObj = { background: 'var(--badge-paid-bg)', color: 'var(--badge-paid-text)', borderColor: 'var(--badge-paid-border)' };
            } else {
                styleObj = { background: 'var(--badge-partial-bg)', color: 'var(--badge-partial-text)', borderColor: 'var(--badge-partial-border)' };
            }
        } else if (module === 'employees') {
            text = item.role || 'Staff';
            styleObj = { background: 'rgba(224,242,254,0.6)', color: '#0369a1', borderColor: '#bae6fd' };
        } else if (module === 'catalog') {
            text = item.category || 'Fabric';
            styleObj = { background: 'rgba(243,244,246,0.8)', color: '#374151', borderColor: '#e5e7eb' };
        } else if (module === 'dispatches') {
            text = status || 'In Transit';
            styleObj = { background: 'rgba(250,245,255,0.8)', color: '#6b21a8', borderColor: '#e9d5ff' };
        }

        if (!text) return null;
        return (
            <span className={styles.badge} style={styleObj}>
                {text}
            </span>
        );
    };

    if (!isOpen || !mounted) return null;

    // Render results view
    const renderContent = () => {
        if (loading) {
            return (
                <div className={styles.emptyState}>
                    <Loader2 className={`${styles.emptyIcon} animate-spin`} style={{ color: 'var(--accent)' }} />
                    <span className={styles.emptyText}>Searching FabricOS...</span>
                </div>
            );
        }

        if (!query.trim()) {
            if (recentSearches.length === 0) {
                return (
                    <div className={styles.emptyState}>
                        <Search className={styles.emptyIcon} />
                        <span className={styles.emptyText}>Type to search across FabricOS enterprise databases</span>
                    </div>
                );
            }

            return (
                <div>
                    <div className={styles.sectionHeader}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <History size={12} /> Recent Searches
                        </span>
                    </div>
                    {recentSearches.map((item, idx) => (
                        <div 
                            key={`recent-${item.module}-${item.id}-${idx}`}
                            data-index={idx}
                            className={`${styles.resultItem} ${activeIndex === idx ? styles.resultItemActive : ''}`}
                            onClick={() => handleSelectItem(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                        >
                            <div className={styles.itemLeft}>
                                {getModuleIcon(item.module)}
                                <div className={styles.itemText}>
                                    <span className={styles.itemTitle}>{getModuleTitle(item.module, item)}</span>
                                    <span className={styles.itemSubtitle}>{getModuleSubtitle(item.module, item)}</span>
                                </div>
                            </div>
                            <div className={styles.itemRight}>
                                {getModuleBadge(item.module, item)}
                                <span className={styles.actionHint}>Jump to ↵</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (flatItems.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <X className={styles.emptyIcon} />
                    <span className={styles.emptyText}>No records found matching "{query}"</span>
                </div>
            );
        }

        // Render Grouped Search Results
        let itemIndexCounter = 0;
        const modules = [
            { key: 'orders', label: 'Orders' },
            { key: 'customers', label: 'Customers' },
            { key: 'vendors', label: 'Vendors' },
            { key: 'invoices', label: 'Invoices' },
            { key: 'challans', label: 'Challans' },
            { key: 'employees', label: 'Employees' },
            { key: 'catalog', label: 'Catalog Designs' },
            { key: 'dispatches', label: 'Dispatches' }
        ];

        return (
            <div>
                {modules.map((m) => {
                    const list = results[m.key] || [];
                    if (list.length === 0) return null;

                    return (
                        <div key={`section-${m.key}`}>
                            <div className={styles.sectionHeader}>{m.label}</div>
                            {list.map((item) => {
                                const currentIndex = itemIndexCounter;
                                itemIndexCounter++;

                                return (
                                    <div 
                                        key={`res-${m.key}-${item.id}`}
                                        data-index={currentIndex}
                                        className={`${styles.resultItem} ${activeIndex === currentIndex ? styles.resultItemActive : ''}`}
                                        onClick={() => handleSelectItem({ ...item, module: m.key })}
                                        onMouseEnter={() => setActiveIndex(currentIndex)}
                                    >
                                        <div className={styles.itemLeft}>
                                            {getModuleIcon(m.key)}
                                            <div className={styles.itemText}>
                                                <span className={styles.itemTitle}>{getModuleTitle(m.key, item)}</span>
                                                <span className={styles.itemSubtitle}>{getModuleSubtitle(m.key, item)}</span>
                                            </div>
                                        </div>
                                        <div className={styles.itemRight}>
                                            {getModuleBadge(m.key, item)}
                                            <span className={styles.actionHint}>Open ↵</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    };

    return createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Search Input Header */}
                <div className={styles.searchHeader}>
                    <Search className={styles.searchIcon} />
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Search orders, customers, vendors, invoices, challans..."
                        className={styles.input}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button className={styles.clearButton} onClick={() => setQuery('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Results List Body */}
                <div className={styles.resultsBody} ref={resultsContainerRef}>
                    {renderContent()}
                </div>

                {/* Quick Navigation Footer */}
                <div className={styles.footer}>
                    <div className={styles.shortcuts}>
                        <span><kbd className={styles.key}>↑↓</kbd> to navigate</span>
                        <span><kbd className={styles.key}>↵</kbd> to open</span>
                        <span><kbd className={styles.key}>esc</kbd> to close</span>
                    </div>
                    <span>FabricOS Global Search</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
