'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './DesignDetailModal.module.css';

export default function AddVariantForm({
    designId,
    onSaved,
    onCancel,
}: {
    designId: string | number;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [colorName, setColorName] = useState('');
    const [colorHex, setColorHex] = useState('#888888');
    const [sku, setSku] = useState('');
    const [stock, setStock] = useState('');
    const [rate, setRate] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!colorName) return;
        setSaving(true);
        try {
            let variantImage = null;
            
            // Upload image if provided
            if (imageFile) {
                const fd = new FormData();
                fd.append('file', imageFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    variantImage = data.url;
                }
            }

            await fetch('/api/catalog/variants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    designId,
                    colorName,
                    colorHex,
                    sku: sku || null,
                    variantImage,
                    stockQuantity: parseFloat(stock) || 0,
                    rate: parseFloat(rate) || null,
                }),
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.addVariantForm}>
            <p className={styles.addVariantTitle}>Add Color Variant</p>
            
            <div className={styles.imageUploadSection}>
                <label className={styles.formLabel}>Variant Image</label>
                <div className={styles.uploadArea}>
                    {imagePreview ? (
                        <div className={styles.previewBox}>
                            <img src={imagePreview} alt="Preview" />
                            <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}>Remove</button>
                        </div>
                    ) : (
                        <label className={styles.uploadLabel}>
                            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                            <span>+ Upload Image</span>
                        </label>
                    )}
                </div>
            </div>

            <div className={styles.formGrid}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>Color Name *</label>
                    <input className={styles.formInput} value={colorName} onChange={e => setColorName(e.target.value)} placeholder="e.g. Red" autoFocus />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>Color Hex</label>
                    <div className={styles.colorPickerRow}>
                        <input type="color" className={styles.colorPickerInput} value={colorHex} onChange={e => setColorHex(e.target.value)} />
                        <input className={styles.formInput} value={colorHex} onChange={e => setColorHex(e.target.value)} style={{ flex: 1 }} />
                    </div>
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>SKU</label>
                    <input className={styles.formInput} value={sku} onChange={e => setSku(e.target.value)} placeholder="Code" />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>Stock (m)</label>
                    <input type="number" className={styles.formInput} value={stock} onChange={e => setStock(e.target.value)} placeholder="0" />
                </div>
            </div>
            <div className={styles.formActions}>
                <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
                <button className={styles.btnSave} onClick={handleSave} disabled={saving || !colorName}>
                    {saving ? 'Saving…' : 'Add'}
                </button>
            </div>
        </div>
    );
}
