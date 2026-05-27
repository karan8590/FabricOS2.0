'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import styles from './EditVariantModal.module.css';
import type { CatalogVariant } from './CatalogDesignCard';

interface EditVariantModalProps {
    variant: CatalogVariant | null;
    designId: string | number;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditVariantModal({ variant, designId, isOpen, onClose, onSaved }: EditVariantModalProps) {
    const [colorName, setColorName] = useState('');
    const [colorHex, setColorHex] = useState('');
    const [sku, setSku] = useState('');
    const [stock, setStock] = useState('');
    const [rate, setRate] = useState('');
    
    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen && variant) {
            setColorName(variant.color_name || '');
            setColorHex(variant.color_hex || '#000000');
            setSku(variant.sku || '');
            setStock(variant.stock_quantity?.toString() || '0');
            setRate(variant.rate?.toString() || '');
            setImageFile(null);
            setImagePreview(variant.variant_image_url || null);
        }
    }, [isOpen, variant]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!variant || isSaving) return;
        setIsSaving(true);
        
        try {
            let variantImage = variant.variant_image_url;
            
            // Upload new image if provided
            if (imageFile) {
                const fd = new FormData();
                fd.append('file', imageFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    variantImage = data.url;
                }
            }

            const res = await fetch(`/api/catalog/variants/${variant.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colorName,
                    colorHex,
                    sku,
                    stockQuantity: parseFloat(stock) || 0,
                    rate: rate ? parseFloat(rate) : null,
                    variantImage,
                })
            });

            if (res.ok) {
                onSaved();
            } else {
                alert('Failed to update variant');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence initial={false}>
            {isOpen && variant && (
                <motion.div 
                    key="edit-variant-overlay"
                    className={styles.overlay} 
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div 
                        className={styles.modal}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        onClick={e => e.stopPropagation()}
                    >
                    <div className={styles.header}>
                        <h2>Edit Variant</h2>
                        <button className={styles.closeBtn} onClick={onClose} disabled={isSaving}><X size={20} /></button>
                    </div>

                    <form className={styles.body} onSubmit={handleSave}>
                        <div className={styles.imageSection}>
                            <div className={styles.imagePreview}>
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" />
                                ) : (
                                    <div className={styles.noImage}><ImageIcon size={32} /></div>
                                )}
                            </div>
                            <label className={styles.imageUploadLabel}>
                                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                                <span>Upload New Image</span>
                            </label>
                        </div>

                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup}>
                                <label>Color Name</label>
                                <input value={colorName} onChange={e => setColorName(e.target.value)} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>HEX Color</label>
                                <div className={styles.colorWrap}>
                                    <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} className={styles.colorPicker} />
                                    <input value={colorHex} onChange={e => setColorHex(e.target.value)} className={styles.colorText} />
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>SKU</label>
                                <input value={sku} onChange={e => setSku(e.target.value)} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Stock (m)</label>
                                <input type="number" value={stock} onChange={e => setStock(e.target.value)} />
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSaving}>Cancel</button>
                            <button type="submit" className={styles.btnSave} disabled={isSaving}>
                                {isSaving ? <Loader2 size={16} className={styles.spin} /> : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
