'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package } from 'lucide-react';
import styles from './VariantSelectionModal.module.css';
import type { CatalogDesign, CatalogVariant } from './CatalogDesignCard';

interface VariantSelectionModalProps {
    design: CatalogDesign | null;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (design: CatalogDesign, variant?: CatalogVariant) => void;
}

export default function VariantSelectionModal({ design, isOpen, onClose, onSelect }: VariantSelectionModalProps) {
    const [loading, setLoading] = useState(true);
    const [variants, setVariants] = useState<CatalogVariant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.log('[DEBUG] VariantSelectionModal mounted, isOpen:', isOpen, 'design:', design?.design_name);
        setMounted(true);
    }, []);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        console.log('[DEBUG] VariantSelectionModal dependencies changed. isOpen:', isOpen, 'design:', design?.design_name);
        if (!isOpen || !design) {
            setVariants([]);
            setSelectedVariantId(null);
            return;
        }

        const fetchFullDesign = async () => {
            setLoading(true);
            try {
                console.log('[DEBUG] VariantSelectionModal fetching variants for design:', design.id);
                const res = await fetch(`/api/catalog/designs/${design.id}`);
                if (res.ok) {
                    const data = await res.json();
                    console.log('[DEBUG] VariantSelectionModal variants loaded:', data.design?.variants?.length);
                    if (data.design && data.design.variants) {
                        setVariants(data.design.variants);
                    } else {
                        setVariants([]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch variants:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFullDesign();
    }, [isOpen, design]);

    if (!mounted) {
        return null; // Only return null during SSR
    }

    console.log('[DEBUG] VariantSelectionModal rendering portal. isOpen:', isOpen, 'Variants count:', variants.length);

    const handleConfirm = () => {
        if (variants.length > 0) {
            const variant = variants.find(v => v.id === selectedVariantId);
            if (variant) onSelect(design!, variant);
        } else {
            onSelect(design!);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && design && (
                <motion.div 
                    className={styles.overlay} 
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div 
                        className={styles.modal} 
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                <div className={styles.header}>
                    <div className={styles.titleBlock}>
                        <h3 className={styles.title}>Select Variant</h3>
                        <p className={styles.subtitle}>
                            <span>{design.design_name}</span>
                            <span>•</span>
                            <span>{design.design_code}</span>
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                            <span>Loading variants...</span>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {variants.length === 0 && (
                                <p className={styles.baseVariantNote}>
                                    This design does not have specific color variants. Confirm to proceed with the base design.
                                </p>
                            )}

                            {variants.length === 0 ? (
                                // Render a mock base variant tile
                                <div 
                                    className={`${styles.card} ${styles.selected}`}
                                    onClick={() => setSelectedVariantId('base')}
                                >
                                    <div className={styles.swatchWrap}>
                                        <div className={styles.swatch} style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Package size={20} color="#64748b" />
                                        </div>
                                        <div className={styles.variantInfo}>
                                            <h4 className={styles.variantName}>Base Design</h4>
                                            <span className={styles.variantSku}>{design.design_code}</span>
                                        </div>
                                    </div>
                                    <div className={styles.footerInfo}>
                                        <span className={styles.price}>₹{design.base_rate}/m</span>
                                        <div className={`${styles.stockBadge} ${design.total_stock > 100 ? styles.green : design.total_stock > 0 ? styles.amber : styles.red}`}>
                                            {design.total_stock > 0 ? `${design.total_stock}m in stock` : 'Out of stock'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                variants.map(variant => {
                                    const stock = variant.stock_quantity || 0;
                                    const isOut = stock <= 0;
                                    const isLow = stock > 0 && stock < 100;
                                    const isSelected = selectedVariantId === variant.id;

                                    return (
                                        <div 
                                            key={variant.id}
                                            className={`${styles.card} ${isOut ? styles.disabled : ''} ${isSelected ? styles.selected : ''}`}
                                            onClick={() => {
                                                if (!isOut) setSelectedVariantId(variant.id);
                                            }}
                                        >
                                            <div className={styles.swatchWrap}>
                                                <div 
                                                    className={styles.swatch} 
                                                    style={{ background: variant.color_hex || '#e2e8f0' }} 
                                                />
                                                <div className={styles.variantInfo}>
                                                    <h4 className={styles.variantName} title={variant.color_name}>{variant.color_name}</h4>
                                                    {variant.sku && <span className={styles.variantSku}>{variant.sku}</span>}
                                                </div>
                                            </div>
                                            <div className={styles.footerInfo}>
                                                <span className={styles.price}>₹{variant.rate || design.base_rate}/m</span>
                                                <div className={`${styles.stockBadge} ${isOut ? styles.red : isLow ? styles.amber : styles.green}`}>
                                                    {isOut ? 'Out of stock' : `${stock}m in stock`}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
                            <button 
                                className={styles.btnConfirm} 
                                onClick={handleConfirm}
                                disabled={loading || (variants.length > 0 && !selectedVariantId) || (variants.length === 0 && selectedVariantId !== 'base' && !design)}
                            >
                                Confirm Selection
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
