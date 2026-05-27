'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Plus, Loader2 } from 'lucide-react';
import styles from './ManageCategoriesModal.module.css';

export interface CatalogCategory {
    id: string;
    name: string;
    is_favorite: boolean;
}

interface ManageCategoriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function ManageCategoriesModal({ isOpen, onClose, onSaved }: ManageCategoriesModalProps) {
    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/catalog/categories');
            const data = await res.json();
            setCategories(data.categories || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim() || saving) return;
        setSaving(true);
        try {
            const res = await fetch('/api/catalog/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategory }),
            });
            if (res.ok) {
                setNewCategory('');
                await fetchCategories();
                onSaved();
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleFavorite = async (id: string, current: boolean) => {
        // Optimistic UI
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_favorite: !current } : c));
        try {
            await fetch(`/api/catalog/categories/${id}/favorite`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: !current }),
            });
            onSaved();
        } catch {
            // Revert
            setCategories(prev => prev.map(c => c.id === id ? { ...c, is_favorite: current } : c));
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    key="manage-categories-overlay"
                    className={styles.overlay} 
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div 
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 6 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        onClick={e => e.stopPropagation()}
                    >
                <div className={styles.header}>
                    <h2>Manage Categories</h2>
                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                </div>
                
                <div className={styles.body}>
                    <form onSubmit={handleAdd} className={styles.addForm}>
                        <input 
                            type="text" 
                            placeholder="Add new category..." 
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            className={styles.input}
                        />
                        <button type="submit" disabled={!newCategory.trim() || saving} className={styles.btnAdd}>
                            {saving ? <Loader2 size={16} className={styles.spinner} /> : <Plus size={16} />}
                        </button>
                    </form>

                    <div className={styles.list}>
                        {loading ? (
                            <div className={styles.loading}>Loading categories...</div>
                        ) : categories.length === 0 ? (
                            <div className={styles.empty}>No categories found</div>
                        ) : (
                            categories.map(c => (
                                <div key={c.id} className={styles.listItem}>
                                    <span className={styles.catName}>{c.name}</span>
                                    <button 
                                        className={`${styles.btnFav} ${c.is_favorite ? styles.active : ''}`}
                                        onClick={() => toggleFavorite(c.id, c.is_favorite)}
                                    >
                                        <Star size={16} fill={c.is_favorite ? "currentColor" : "none"} />
                                        <span>{c.is_favorite ? 'Favorite' : 'Add to Favorites'}</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
                <div className={styles.footer}>
                    <button className={styles.btnDone} onClick={onClose}>Done</button>
                </div>
                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
