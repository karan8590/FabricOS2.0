'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Plus, Edit2, Trash2, Tag, Layers, Palette, Grid3X3, Maximize2, Minimize2 } from 'lucide-react';
import styles from './DesignDetailModal.module.css';
import type { CatalogDesign, CatalogVariant, DesignMasterSheet } from './CatalogDesignCard';
import AddVariantsFlowModal from './AddVariantsFlowModal';
import EditVariantModal from './EditVariantModal';

interface DesignDetailModalProps {
    design: CatalogDesign | null;
    isOpen: boolean;
    isAdmin?: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function DesignDetailModal({
    design,
    isOpen,
    isAdmin,
    onClose,
    onUpdate,
}: DesignDetailModalProps) {
    const [mounted, setMounted] = useState(false);
    const [showAddFlow, setShowAddFlow] = useState(false);
    const [masterSheets, setMasterSheets] = useState<DesignMasterSheet[]>([]);
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    const [variants, setVariants] = useState<CatalogVariant[]>([]);
    const [isLoadingVariants, setIsLoadingVariants] = useState(false);
    const [editingVariant, setEditingVariant] = useState<CatalogVariant | null>(null);
    
    const [selectedVariantId, setSelectedVariantId] = useState<number | string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (design && isOpen) {
            setShowAddFlow(false);
            setSelectedVariantId(null);
            setIsFullscreen(false);
            setIsLoadingVariants(true);
            
            fetch(`/api/catalog/designs/${design.id}/variants`)
                .then(res => res.json())
                .then(data => {
                    if (data.variants) setVariants(data.variants);
                    if (data.masterSheets) {
                        setMasterSheets(data.masterSheets);
                        if (data.masterSheets.length > 0 && !selectedSheetId) {
                            setSelectedSheetId(data.masterSheets[0].id);
                        }
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoadingVariants(false));
        } else {
            setVariants([]);
            setMasterSheets([]);
            setSelectedSheetId(null);
        }
    }, [design, isOpen]);

    // The user wants the variants to remain in their original order.
    const sortedVariants = variants;

    // DEFAULT PREVIEW: Variant image -> Master sheet image -> Design thumbnail
    const activeSheet = masterSheets.find(s => s.id === selectedSheetId);
    
    const activeImage = selectedVariantId 
        ? variants.find(v => v.id === selectedVariantId)?.variant_image_url || activeSheet?.image_url || design?.image_url 
        : (activeSheet?.image_url || design?.image_url);

    const handleDeleteVariant = useCallback(async (variantId: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this color variant?')) return;
        setVariants(prev => prev.filter(v => v.id !== variantId));
        if (selectedVariantId === variantId) setSelectedVariantId(null);
        try {
            await fetch(`/api/catalog/variants/${variantId}`, { method: 'DELETE' });
            onUpdate();
        } catch { /* revert */ }
    }, [onUpdate, selectedVariantId]);

    const handleStockChange = useCallback(async (variantId: number, stock: number) => {
        setVariants(prev => prev.map(v => v.id === variantId ? { ...v, stock_quantity: stock } : v));
        await fetch(`/api/catalog/variants/${variantId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock_quantity: stock }),
        });
        onUpdate();
    }, [onUpdate]);

    const handleVariantAdded = useCallback(() => {
        onUpdate();
        if (design) {
            fetch(`/api/catalog/designs/${design.id}`)
                .then(r => r.json())
                .then(data => setVariants(data.design?.variants || []));
        }
    }, [design, onUpdate]);

    const handleVariantUpdated = useCallback(() => {
        setEditingVariant(null);
        onUpdate();
        if (design) {
            fetch(`/api/catalog/designs/${design.id}`)
                .then(r => r.json())
                .then(data => setVariants(data.design?.variants || []));
        }
    }, [design, onUpdate]);

    if (!mounted) return null;

    return createPortal(
        <>
            <AnimatePresence initial={false}>
                {isOpen && design && (
                    <motion.div
                        key="design-detail-overlay"
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                    >
                            <motion.div
                                className={`${styles.modal} ${isFullscreen ? styles.modalFullscreen : ''}`}
                                initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                                onClick={e => e.stopPropagation()}
                            >
                            <div className={styles.header}>
                                <div className={styles.headerInfo}>
                                    <div className={styles.headerCode}>{design.design_code}</div>
                                    <h2 className={styles.headerName}>{design.design_name}</h2>
                                    <div className={styles.headerMeta}>
                                        {design.category && <span className={styles.metaPill}><Tag size={11} />{design.category}</span>}
                                        {design.fabric_type && <span className={styles.metaPill}><Layers size={11} />{design.fabric_type}</span>}
                                        <span className={styles.metaPill}><Palette size={11} />{variants.length} colors</span>
                                    </div>
                                </div>
                                <div className={styles.headerActions}>
                                    <button className={styles.closeBtn} onClick={() => setIsFullscreen(!isFullscreen)} title="Toggle Fullscreen">
                                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    </button>
                                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                                </div>
                            </div>

                            <div className={styles.galleryBody}>
                                {/* Left Pane - HD Preview */}
                                <div className={styles.previewPane}>

                                    <div className={styles.previewWrap}>
                                        {activeImage ? (
                                            <img src={activeImage} alt="HD Preview" className={styles.hdPreview} />
                                        ) : (
                                            <div className={styles.noImagePreview}>
                                                <Package size={48} opacity={0.2} />
                                                <p>No image available</p>
                                            </div>
                                        )}
                                        {selectedVariantId && (
                                            <button className={styles.btnViewMaster} onClick={() => setSelectedVariantId(null)}>
                                                View Master Sheet
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Right Pane - Variants List */}
                                <div className={styles.listPane}>
                                    <div className={styles.listHeader}>
                                        <h3>Variants ({variants.length})</h3>
                                        {isAdmin && (
                                            <div className={styles.listActions}>
                                                <button className={styles.btnAdd} onClick={() => setShowAddFlow(true)}>
                                                    <Plus size={14} /> Add
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.variantsList}>
                                        {isLoadingVariants ? (
                                            <div className={styles.emptyVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#94a3b8' }}>
                                                Loading variants...
                                            </div>
                                        ) : variants.length === 0 ? (
                                            <div className={styles.emptyVariants}>
                                                <Palette size={24} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                                <p style={{ marginBottom: '16px' }}>No variants added yet</p>
                                                {isAdmin && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                                        <button 
                                                            className={styles.btnAdd} 
                                                            style={{ width: '100%', padding: '8px', justifyContent: 'center' }}
                                                            onClick={() => setShowAddFlow(true)}
                                                        >
                                                            <Plus size={14} /> Add Variants
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {masterSheets.map(sheet => {
                                                    const sheetVariants = sortedVariants.filter(v => v.master_sheet_id === sheet.id);
                                                    if (sheetVariants.length === 0) return null;

                                                    return (
                                                        <div key={sheet.id} className={styles.variantGroup}>
                                                            <h4 className={styles.variantGroupTitle}>{sheet.title || 'Master Sheet'}</h4>
                                                            {sheetVariants.map(v => (
                                                                <div 
                                                                    key={v.id} 
                                                                    className={`${styles.variantItem} ${selectedVariantId === v.id ? styles.variantItemActive : ''}`}
                                                                    onClick={() => {
                                                                        setSelectedSheetId(sheet.id);
                                                                        setSelectedVariantId(v.id);
                                                                    }}
                                                                >
                                                                    {v.variant_image_url ? (
                                                                        <img src={v.variant_image_url} alt={v.color_name} className={styles.variantThumb} />
                                                                    ) : (
                                                                        <div className={styles.variantColorChip} style={{ background: v.color_hex || '#888' }} />
                                                                    )}
                                                                    
                                                                    <div className={styles.variantInfo}>
                                                                        <span className={styles.vName}>{v.sku || v.color_name || 'Unnamed'}</span>
                                                                        <div className={styles.vMeta}>
                                                                            <span className={styles.vStock}>{v.stock_quantity || 0}m stock</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {isAdmin && (
                                                                        <div className={styles.vActions}>
                                                                            <button 
                                                                                className={styles.vDelete} 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingVariant(v);
                                                                                }}
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button 
                                                                                className={styles.vDelete} 
                                                                                onClick={(e) => handleDeleteVariant(v.id, e)}
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}

                                                {/* Independent variants (no master sheet) */}
                                                {(() => {
                                                    const independentVariants = sortedVariants.filter(v => !v.master_sheet_id);
                                                    if (independentVariants.length === 0) return null;

                                                    return (
                                                        <div className={styles.variantGroup}>
                                                            {masterSheets.length > 0 && <h4 className={styles.variantGroupTitle}>Other Variants</h4>}
                                                            {independentVariants.map(v => (
                                                                <div 
                                                                    key={v.id} 
                                                                    className={`${styles.variantItem} ${selectedVariantId === v.id ? styles.variantItemActive : ''}`}
                                                                    onClick={() => {
                                                                        setSelectedSheetId(null);
                                                                        setSelectedVariantId(v.id);
                                                                    }}
                                                                >
                                                                    {v.variant_image_url ? (
                                                                        <img src={v.variant_image_url} alt={v.color_name} className={styles.variantThumb} />
                                                                    ) : (
                                                                        <div className={styles.variantColorChip} style={{ background: v.color_hex || '#888' }} />
                                                                    )}
                                                                    
                                                                    <div className={styles.variantInfo}>
                                                                        <span className={styles.vName}>{v.sku || v.color_name || 'Unnamed'}</span>
                                                                        <div className={styles.vMeta}>
                                                                            <span className={styles.vStock}>{v.stock_quantity || 0}m stock</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {isAdmin && (
                                                                        <div className={styles.vActions}>
                                                                            <button 
                                                                                className={styles.vDelete} 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingVariant(v);
                                                                                }}
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button 
                                                                                className={styles.vDelete} 
                                                                                onClick={(e) => handleDeleteVariant(v.id, e)}
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {design && (
                <AddVariantsFlowModal
                    design={design}
                    isOpen={showAddFlow}
                    onClose={() => setShowAddFlow(false)}
                    onSuccess={() => {
                        setShowAddFlow(false);
                        setIsLoadingVariants(true);
                        fetch(`/api/catalog/designs/${design.id}/variants`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.variants) setVariants(data.variants);
                                if (data.masterSheets) setMasterSheets(data.masterSheets);
                            })
                            .catch(console.error)
                            .finally(() => setIsLoadingVariants(false));
                        onUpdate();
                    }}
                />
            )}

            {design && editingVariant && (
                <EditVariantModal
                    variant={editingVariant}
                    designId={design.id}
                    isOpen={true}
                    onClose={() => setEditingVariant(null)}
                    onSaved={() => {
                        setEditingVariant(null);
                        setIsLoadingVariants(true);
                        fetch(`/api/catalog/designs/${design.id}/variants`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.variants) setVariants(data.variants);
                            })
                            .catch(console.error)
                            .finally(() => setIsLoadingVariants(false));
                        onUpdate();
                    }}
                />
            )}
        </>,
        document.body
    );
}
