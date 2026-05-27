'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Layers, Package, Palette, Trash2, Loader2, AlertTriangle, Star, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogDesignCard, type CatalogDesign } from '@/components/catalog/CatalogDesignCard';
import DesignDetailModal from '@/components/catalog/DesignDetailModal';
import ManageCategoriesModal from '@/components/catalog/ManageCategoriesModal';
import styles from './Catalog.module.css';

// ─── New Design Form Modal ────────────────────────────────────────────────────
function NewDesignModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
    const [designCode, setDesignCode] = useState('');
    const [designName, setDesignName] = useState('');
    const [baseRate, setBaseRate] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Image upload state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setError('');
        if (!designCode || !designName) {
            setError('Design Code and Design Name are required.');
            return;
        }
        setSaving(true);
        try {
            let imageUrl = '';

            // Upload image if selected
            if (imageFile) {
                setUploading(true);
                const fd = new FormData();
                fd.append('file', imageFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!uploadRes.ok) {
                    throw new Error('Image upload failed. Please try again.');
                }
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.url || '';
                setUploading(false);
            }

            const res = await fetch('/api/catalog/designs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designCode, designName, baseRate: parseFloat(baseRate) || 0, imageUrl, description }),
            });
            
            if (res.ok) { 
                onSaved(); 
                onClose(); 
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create design. Please check if the design code already exists.');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong while saving.');
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    key="new-design-overlay"
                    className={styles.overlay} 
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
            <motion.div
                className={styles.formModal}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}
            >
                <div className={styles.formModalHeader}>
                    <h2>New Design</h2>
                    <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
                </div>
                <div className={styles.formModalBody}>
                    {/* Row 1: Code + Name */}
                    <div>
                        <label className={styles.fieldLabel}>Design Code *</label>
                        <input className={styles.fieldInput} value={designCode} onChange={e => setDesignCode(e.target.value)} placeholder="e.g. SB-1093" autoFocus />
                    </div>
                    <div>
                        <label className={styles.fieldLabel}>Design Name *</label>
                        <input className={styles.fieldInput} value={designName} onChange={e => setDesignName(e.target.value)} placeholder="e.g. Paisley Classic" />
                    </div>

                    {/* Row 2: Base Rate (half width) + empty spacer */}
                    <div>
                        <label className={styles.fieldLabel}>Base Rate (₹/m)</label>
                        <input type="number" className={styles.fieldInput} value={baseRate} onChange={e => setBaseRate(e.target.value)} placeholder="0" />
                    </div>
                    <div />

                    {/* Image upload — full width */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.fieldLabel}>Design Thumbnail</label>
                        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8, marginTop: -4 }}>This will be used as the catalog cover. You can upload the master sheet later.</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        {imagePreview ? (
                            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', display: 'block' }}
                                />
                                <button
                                    onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                                >
                                    <X size={12} />
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(15,23,42,0.7)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '100%', padding: '20px 12px', border: '2px dashed #e2e8f0',
                                    borderRadius: 8, background: '#fafafa', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                    color: '#94a3b8', fontSize: 13, transition: 'border-color 0.15s',
                                    boxSizing: 'border-box',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#94a3b8')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                            >
                                <Package size={22} style={{ opacity: 0.4 }} />
                                <span>Click to upload thumbnail from device</span>
                                <span style={{ fontSize: 11, opacity: 0.6 }}>JPG, PNG, WebP — max 5 MB</span>
                            </button>
                        )}
                    </div>

                    {/* Description — full width */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.fieldLabel}>Description</label>
                        <input className={styles.fieldInput} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description or notes" />
                    </div>
                    
                    {error && (
                        <div style={{ gridColumn: '1 / -1', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <X size={14} />
                            {error}
                        </div>
                    )}
                </div>
                <div className={styles.formModalFooter}>
                    <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
                    <button className={styles.btnSave} onClick={handleSave} disabled={saving || uploading || !designCode || !designName}>
                        {uploading ? 'Uploading…' : saving ? 'Creating…' : 'Create Design'}
                    </button>
                </div>
                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function CatalogSkeleton() {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', height: 320 }}>
                    <div style={{ height: 180, background: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ padding: 16 }}>
                        <div style={{ height: 16, width: '40%', background: '#e2e8f0', borderRadius: 4, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
                        <div style={{ height: 20, width: '80%', background: '#e2e8f0', borderRadius: 4, marginBottom: 16, animation: 'pulse 1.5s infinite' }} />
                        <div style={{ height: 12, width: '100%', background: '#f1f5f9', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main Catalog Page ────────────────────────────────────────────────────────
export default function CatalogPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [designs, setDesigns] = useState<CatalogDesign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterFabric, setFilterFabric] = useState('');
    const [filterColor, setFilterColor] = useState('');
    const [filterStock, setFilterStock] = useState('');

    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);
    const [designToDelete, setDesignToDelete] = useState<CatalogDesign | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Stats & Filters
    const [globalStats, setGlobalStats] = useState({ totalDesigns: 0, totalVariants: 0, totalStock: 0 });
    const [categories, setCategories] = useState<string[]>([]);
    const [fabrics, setFabrics] = useState<string[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);



    // Categories & Favorites
    const [managedCategories, setManagedCategories] = useState<{id: string, name: string, is_favorite: boolean}[]>([]);
    const [showManageCategories, setShowManageCategories] = useState(false);

    useEffect(() => {
        if (showNewModal || selectedDesign || designToDelete || showManageCategories) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showNewModal, selectedDesign, designToDelete, showManageCategories]);

    // Initial Global Stats Fetch
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/catalog/designs/stats');
                const data = await res.json();
                if (data.stats) setGlobalStats(data.stats);
                if (data.filters) {
                    setFabrics(data.filters.fabrics);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchStats();
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/catalog/categories');
            const data = await res.json();
            if (data.categories) setManagedCategories(data.categories);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const fetchDesigns = useCallback(async (pageIndex: number, isReset: boolean = false) => {
        if (isReset) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (filterCategory) params.set('category', filterCategory);
            if (filterFabric) params.set('fabric', filterFabric);
            if (filterColor) params.set('color', filterColor);
            if (filterStock) params.set('in_stock', filterStock);
            params.set('page', pageIndex.toString());
            params.set('limit', '20');

            const res = await fetch(`/api/catalog/designs?${params}`);
            const data = await res.json();

            setDesigns(prev => isReset ? (data.designs || []) : [...prev, ...(data.designs || [])]);
            setHasMore(data.hasMore);
            setPage(pageIndex);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [search, filterCategory, filterFabric, filterColor, filterStock]);

    // Reset pagination on filter change
    const debounceTimer = useRef<NodeJS.Timeout>();
    useEffect(() => {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchDesigns(1, true), 300);
        return () => clearTimeout(debounceTimer.current);
    }, [fetchDesigns]);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    fetchDesigns(page + 1, false);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, page, fetchDesigns]);

    const handleDeleteDesign = useCallback((design: CatalogDesign) => {
        setDesignToDelete(design);
    }, []);

    const confirmDeleteDesign = async () => {
        if (!designToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/catalog/designs/${designToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDesigns(prev => prev.filter(d => d.id !== designToDelete.id));
                // Update stats locally to prevent refetch
                setGlobalStats(prev => ({ ...prev, totalDesigns: prev.totalDesigns - 1 }));
                setDesignToDelete(null);
            } else {
                alert('Failed to delete design');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Keyboard support for delete modal
    useEffect(() => {
        if (!designToDelete) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDeleting) setDesignToDelete(null);
            if (e.key === 'Enter' && !isDeleting) confirmDeleteDesign();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [designToDelete, isDeleting]);

    return (
        <div className={styles.page}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                {/* Search */}
                <div className={styles.searchWrap}>
                    <Search className={styles.searchIcon} size={15} />
                    <input
                        id="catalog-search"
                        className={styles.searchInput}
                        placeholder="Search by code, name, or tag…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className={styles.filterGroup}>
                    <select className={styles.filterSelect} value={filterFabric} onChange={e => setFilterFabric(e.target.value)}>
                        <option value="">Fabric ▼</option>
                        {fabrics.map(f => <option key={f} value={f!}>{f}</option>)}
                    </select>
                    <select className={styles.filterSelect} value={filterColor} onChange={e => setFilterColor(e.target.value)}>
                        <option value="">Color ▼</option>
                        {Array.from(new Set(designs.flatMap(d => d.variants?.map(v => v.color_name) || [])))
                            .filter(Boolean)
                            .map(c => <option key={c} value={c}>{c}</option>)
                        }
                    </select>
                    <select className={styles.filterSelect} value={filterStock} onChange={e => setFilterStock(e.target.value)}>
                        <option value="">Stock ▼</option>
                        <option value="1">In Stock</option>
                    </select>
                </div>

                {isAdmin && (
                    <button id="btn-new-design" className={styles.btnNewDesign} onClick={() => setShowNewModal(true)}>
                        <Plus size={15} /> New Design
                    </button>
                )}
            </div>

            {/* Favorites Row */}
            <div className={styles.favoritesRow}>
                <div className={styles.favIconWrap}>
                    <Star size={14} fill="#fbbf24" color="#fbbf24" /> 
                    <span className={styles.favTitle}>Favorites:</span>
                </div>
                <div className={styles.favList}>
                    {managedCategories.filter(c => c.is_favorite).map(c => (
                        <button
                            key={c.id}
                            className={`${styles.favPill} ${filterCategory === c.name ? styles.favPillActive : ''}`}
                            onClick={() => setFilterCategory(filterCategory === c.name ? '' : c.name)}
                        >
                            {c.name}
                        </button>
                    ))}
                    <button className={styles.favAddBtn} onClick={() => setShowManageCategories(true)}>
                        <Plus size={14} /> Add
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {(globalStats.totalDesigns > 0) && (
                <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <Layers size={14} style={{ color: '#64748b' }} />
                        <span className={styles.statValue}>{globalStats.totalDesigns}</span>
                        <span className={styles.statLabel}>designs</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <Palette size={14} style={{ color: '#64748b' }} />
                        <span className={styles.statValue}>{globalStats.totalVariants}</span>
                        <span className={styles.statLabel}>color variants</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <Package size={14} style={{ color: '#64748b' }} />
                        <span className={styles.statValue}>{globalStats.totalStock.toLocaleString('en-IN')}m</span>
                        <span className={styles.statLabel}>total stock</span>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className={styles.grid}>
                {loading ? (
                    <CatalogSkeleton />
                ) : designs.length === 0 ? (
                    <div className={styles.empty}>
                        <Layers size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <h3>No designs found</h3>
                        <p>Try adjusting your search or filters{isAdmin ? ', or create your first design.' : '.'}</p>
                    </div>
                ) : (
                    <>
                        {designs.map(design => (
                            <CatalogDesignCard
                                key={design.id}
                                design={design}
                                isAdmin={isAdmin}
                                onClick={setSelectedDesign}
                                onEdit={isAdmin ? setSelectedDesign : undefined}
                                onDelete={isAdmin ? handleDeleteDesign : undefined}
                            />
                        ))}
                        
                        {/* Intersection Observer Target */}
                        {hasMore && (
                            <div ref={observerTarget} style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>
                                {loadingMore ? 'Loading more designs...' : ''}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Design Modal */}
            <NewDesignModal
                isOpen={showNewModal}
                onClose={() => setShowNewModal(false)}
                onSaved={() => { fetchDesigns(1, true); setShowNewModal(false); }}
            />

            <DesignDetailModal
                design={selectedDesign}
                isOpen={!!selectedDesign}
                isAdmin={isAdmin}
                onClose={() => setSelectedDesign(null)}
                onUpdate={() => { 
                    if (!selectedDesign) return;
                    fetch(`/api/catalog/designs/${selectedDesign.id}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.design) {
                                setDesigns(prev => prev.map(d => d.id === data.design.id ? data.design : d));
                                setSelectedDesign(data.design);
                            }
                        })
                        .catch(console.error);
                }}
            />

            {/* Manage Categories Modal */}
            <ManageCategoriesModal
                isOpen={showManageCategories}
                onClose={() => setShowManageCategories(false)}
                onSaved={() => fetchCategories()}
            />

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {designToDelete && (
                    <motion.div 
                        key="delete-overlay"
                        className={styles.deleteOverlay} 
                        onClick={() => !isDeleting && setDesignToDelete(null)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div 
                            className={styles.deleteModal}
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 6 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={styles.deleteHeader}>
                                <div className={styles.deleteIconWrap}>
                                    <Trash2 size={20} className={styles.deleteIcon} />
                                </div>
                                <div className={styles.deleteTitleWrap}>
                                    <h3 className={styles.deleteTitle}>Delete Design</h3>
                                    <p className={styles.deleteSubtitle}>This action permanently removes this design and its variants.</p>
                                </div>
                            </div>
                            
                            <div className={styles.deleteBody}>
                                <p className={styles.deleteText}>You are about to permanently delete:</p>
                                <ul className={styles.deleteList}>
                                    <li><strong>{designToDelete.design_name}</strong></li>
                                    <li>All linked color variants</li>
                                    <li>Associated stock references</li>
                                </ul>
                                
                                <div className={styles.deleteWarning}>
                                    <AlertTriangle size={14} />
                                    <span>This action cannot be undone.</span>
                                </div>
                                
                                <p className={styles.deleteNote}>Orders and invoices already created will remain unaffected.</p>
                            </div>
                            
                            <div className={styles.deleteFooter}>
                                <button 
                                    className={styles.btnCancelDelete} 
                                    onClick={() => setDesignToDelete(null)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className={styles.btnConfirmDelete} 
                                    onClick={confirmDeleteDesign}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <><Loader2 size={14} className={styles.spinner} /> Deleting...</> : 'Delete Design'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
