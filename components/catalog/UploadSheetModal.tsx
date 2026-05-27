'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import styles from './EditVariantModal.module.css';

interface UploadSheetModalProps {
    designId: string | number;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function UploadSheetModal({ designId, isOpen, onClose, onSaved }: UploadSheetModalProps) {
    const [title, setTitle] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setImageFile(null);
            setImagePreview(null);
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !imageFile) return;
        setIsSaving(true);
        
        try {
            // Upload new image
            const fd = new FormData();
            fd.append('file', imageFile);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
            
            if (!uploadRes.ok) throw new Error('Image upload failed');
            const data = await uploadRes.json();
            const imageUrl = data.url;

            const res = await fetch(`/api/catalog/designs/${designId}/master-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    imageUrl,
                })
            });

            if (res.ok) {
                onSaved();
            } else {
                alert('Failed to upload master sheet');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while uploading.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    key="upload-sheet-overlay"
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={onClose}
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
                            <h3>Upload Master Sheet</h3>
                            <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                        </div>
                        
                        <form onSubmit={handleSave} className={styles.body}>
                            <div className={styles.imageSection}>
                                <div className={styles.previewBox}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" />
                                    ) : (
                                        <div className={styles.noImage}>
                                            <ImageIcon size={32} opacity={0.3} />
                                            <span>Select Image</span>
                                        </div>
                                    )}
                                </div>
                                <label className={styles.uploadLabel}>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className={styles.fileInput} />
                                    {imagePreview ? 'Change Image' : 'Upload Image'}
                                </label>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Sheet Title / Collection Name</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        placeholder="e.g. Classic Colors, Summer Set..." 
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.footer}>
                                <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
                                <button type="submit" className={styles.btnSave} disabled={isSaving || !imageFile}>
                                    {isSaving ? <Loader2 size={16} className={styles.spin} /> : 'Upload'}
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
