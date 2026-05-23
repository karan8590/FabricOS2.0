'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Search, Filter, Star, Clock, Flame, 
    ChevronRight, Check, Package, Layers, 
    Tags, Info, ArrowUpRight, TrendingUp
} from 'lucide-react';
import styles from './DesignPickerModal.module.css';

interface Design {
    id: number;
    name: string;
    category: string;
    price_per_meter: number;
    image_url: string;
    available: number;
    stock: number;
    is_favorite: number;
    tags: string;
    code: string;
}

interface DesignPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (design: Design) => void;
    selectedDesignId?: number;
}

const CATEGORIES = [
    { id: 'all', label: 'All Designs', icon: <Layers size={16} /> },
    { id: 'favorites', label: 'Favorites', icon: <Star size={16} /> },
    { id: 'recent', label: 'Recently Used', icon: <Clock size={16} /> },
    { id: 'trending', label: 'Trending', icon: <TrendingUp size={16} /> },
    { id: 'separator', type: 'separator' },
    { id: 'Linen', label: 'Linen', icon: <ChevronRight size={14} /> },
    { id: 'Cotton', label: 'Cotton', icon: <ChevronRight size={14} /> },
    { id: 'Velvet', label: 'Velvet', icon: <ChevronRight size={14} /> },
    { id: 'Silk', label: 'Silk', icon: <ChevronRight size={14} /> },
];

export default function DesignPickerModal({ isOpen, onClose, onSelect, selectedDesignId }: DesignPickerModalProps) {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        if (isOpen) {
            fetchDesigns();
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen]);

    const fetchDesigns = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/designs');
            if (res.ok) {
                const data = await res.json();
                setDesigns(data.designs);
            }
        } catch (error) {
            console.error('Failed to fetch designs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDesigns = useMemo(() => {
        return designs.filter(design => {
            const matchesSearch = !searchQuery || 
                (design.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (design.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (design.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (design.tags || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = 
                activeCategory === 'all' ||
                (activeCategory === 'favorites' && design.is_favorite === 1) ||
                (activeCategory === 'trending' && design.stock < 100) || // Mock trending
                (activeCategory === 'recent' && design.id % 3 === 0) || // Mock recent
                design.category === activeCategory;

            return matchesSearch && matchesCategory;
        });
    }, [designs, searchQuery, activeCategory]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={20} />
                        <input 
                            className={styles.searchInput}
                            placeholder="Search by name, category, or product code..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                        <span className={styles.kdbHint}>ESC</span>
                    </button>
                </header>

                <div className={styles.body}>
                    {/* Sidebar */}
                    <aside className={styles.sidebar}>
                        <nav className={styles.nav}>
                            {CATEGORIES.map((cat, idx) => {
                                if (cat.type === 'separator') return <div key={`sep-${idx}`} className={styles.separator} />;
                                return (
                                    <button
                                        key={cat.id}
                                        className={`${styles.navItem} ${activeCategory === cat.id ? styles.activeNav : ''}`}
                                        onClick={() => setActiveCategory(cat.id!)}
                                    >
                                        {cat.icon}
                                        <span>{cat.label}</span>
                                        {cat.id === 'favorites' && designs.filter(d => d.is_favorite).length > 0 && (
                                            <span className={styles.badge}>{designs.filter(d => d.is_favorite).length}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Content */}
                    <main className={styles.content}>
                        {loading ? (
                            <div className={styles.loading}>
                                <div className={styles.spinner} />
                                <span>Loading catalog...</span>
                            </div>
                        ) : filteredDesigns.length > 0 ? (
                            <div className={styles.grid}>
                                {filteredDesigns.map(design => (
                                    <div 
                                        key={design.id} 
                                        className={`${styles.card} ${selectedDesignId === design.id ? styles.selectedCard : ''}`}
                                        onClick={() => onSelect(design)}
                                    >
                                        <div className={styles.imageWrapper}>
                                            {design.image_url ? (
                                                <img src={design.image_url} alt={design.name} className={styles.image} />
                                            ) : (
                                                <div className={styles.imagePlaceholder}>
                                                    <Package size={32} />
                                                </div>
                                            )}
                                            {design.is_favorite === 1 && (
                                                <div className={styles.favoriteBadge}>
                                                    <Star size={12} fill="currentColor" />
                                                </div>
                                            )}
                                            {design.stock < 50 && (
                                                <div className={styles.lowStockBadge}>Low Stock</div>
                                            )}
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.category}>{design.category}</span>
                                                <span className={styles.code}>{design.code}</span>
                                            </div>
                                            <h3 className={styles.designName}>{design.name}</h3>
                                            <div className={styles.cardFooter}>
                                                <div className={styles.price}>
                                                    <span className={styles.currency}>₹</span>
                                                    <span className={styles.amount}>{design.price_per_meter}</span>
                                                    <span className={styles.unit}>/m</span>
                                                </div>
                                                <div className={styles.stockInfo}>
                                                    <div className={styles.stockDot} style={{ background: design.stock > 100 ? '#34C759' : '#FF9500' }} />
                                                    <span>{design.stock}m left</span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedDesignId === design.id && (
                                            <div className={styles.selectionOverlay}>
                                                <Check size={24} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}><Search size={48} /></div>
                                <h2>No designs found</h2>
                                <p>Try adjusting your search or category filters</p>
                                <button className={styles.resetBtn} onClick={() => {setSearchQuery(''); setActiveCategory('all');}}>Clear all filters</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
