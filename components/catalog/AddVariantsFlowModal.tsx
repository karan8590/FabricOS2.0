'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Grid3X3, UploadCloud, Loader2, ArrowRight } from 'lucide-react';
import styles from './AddVariantsFlowModal.module.css';
import type { CatalogDesign } from './CatalogDesignCard';

interface AddVariantsFlowModalProps {
    design: CatalogDesign;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const getDominantColor = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 4 * 10) {
            const tr = data[i], tg = data[i+1], tb = data[i+2], a = data[i+3];
            if (a < 255) continue;
            if ((tr > 240 && tg > 240 && tb > 240) || (tr < 15 && tg < 15 && tb < 15)) continue;
            r += tr; g += tg; b += tb; count++;
        }
        
        if (count === 0) return '#888888';
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    } catch {
        return '#888888';
    }
};

export default function AddVariantsFlowModal({ design, isOpen, onClose, onSuccess }: AddVariantsFlowModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [mode, setMode] = useState<'single' | 'multiple' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Single Variant State
    const [singleImageFile, setSingleImageFile] = useState<File | null>(null);
    const [singleImagePreview, setSingleImagePreview] = useState<string | null>(null);
    const [singleCode, setSingleCode] = useState('');
    const [singleStock, setSingleStock] = useState('');
    const [singleRate, setSingleRate] = useState(String(design.base_rate || ''));

    // Multiple Variants State
    const [multiImageFile, setMultiImageFile] = useState<File | null>(null);
    const [multiImagePreview, setMultiImagePreview] = useState<string | null>(null);
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
    const [rows, setRows] = useState(2);
    const [cols, setCols] = useState(2);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setMode(null);
            setSingleImageFile(null);
            setSingleImagePreview(null);
            setSingleCode('');
            setSingleStock('');
            setSingleRate(String(design.base_rate || ''));
            
            setMultiImageFile(null);
            setMultiImagePreview(null);
            setImageObj(null);
            setRows(2);
            setCols(2);
            setIsProcessing(false);
        }
    }, [isOpen, design.base_rate]);

    const handleSingleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSingleImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setSingleImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
        if (!singleCode) setSingleCode(`${design.design_code}-A`);
    };

    const handleMultiImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMultiImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setMultiImagePreview(result);
            const img = new Image();
            img.onload = () => setImageObj(img);
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSingle = async () => {
        if (!singleCode) return alert('Variant code is required');
        setIsProcessing(true);
        try {
            let variantImageUrl = null;
            if (singleImageFile) {
                const fd = new FormData();
                fd.append('file', singleImageFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!uploadRes.ok) throw new Error('Upload failed');
                const { url } = await uploadRes.json();
                variantImageUrl = url;
            }

            const res = await fetch('/api/catalog/variants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    designId: design.id,
                    colorName: singleCode,
                    sku: singleCode,
                    stockQuantity: singleStock ? parseInt(singleStock) : 0,
                    rate: singleRate ? parseFloat(singleRate) : 0,
                    variantImage: variantImageUrl
                })
            });

            if (!res.ok) throw new Error('Failed to save variant');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error saving variant');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveMultiple = async () => {
        if (!imageObj || !multiImageFile) return;
        setIsProcessing(true);

        try {
            // 1. Upload Master Sheet
            const fdMaster = new FormData();
            fdMaster.append('file', multiImageFile);
            const uploadMasterRes = await fetch('/api/upload', { method: 'POST', body: fdMaster });
            if (!uploadMasterRes.ok) throw new Error('Master sheet upload failed');
            const masterUploadData = await uploadMasterRes.json();
            const masterSheetUrl = masterUploadData.url;

            // 2. Create Master Sheet DB Entry
            const sheetRes = await fetch(`/api/catalog/designs/${design.id}/master-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Extracted Master Sheet',
                    imageUrl: masterSheetUrl,
                })
            });
            if (!sheetRes.ok) throw new Error('Failed to create master sheet record');
            const sheetData = await sheetRes.json();
            const masterSheetId = sheetData.masterSheet.id;

            // 3. Slice the grid & extract colors
            const cropWidth = imageObj.width / cols;
            const cropHeight = imageObj.height / rows;
            let counter = 1;
            const crops = [];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = cropWidth;
                    canvas.height = cropHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    ctx.drawImage(
                        imageObj,
                        c * cropWidth, r * cropHeight, cropWidth, cropHeight,
                        0, 0, cropWidth, cropHeight
                    );

                    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9));
                    if (blob) {
                        const dominantHex = getDominantColor(canvas, ctx);
                        const letter = String.fromCharCode(64 + counter);
                        crops.push({
                            blob,
                            code: `${design.design_code}-${letter}`,
                            colorHex: dominantHex
                        });
                        counter++;
                    }
                }
            }

            // 4. Upload individual variants
            const uploadPromises = crops.map(async (crop) => {
                const fd = new FormData();
                fd.append('file', crop.blob, `${crop.code}.jpg`);
                
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!uploadRes.ok) throw new Error(`Upload failed for ${crop.code}`);
                const { url } = await uploadRes.json();
                
                return {
                    designId: design.id,
                    masterSheetId: masterSheetId,
                    colorName: crop.code,
                    colorHex: crop.colorHex,
                    sku: crop.code,
                    variantImage: url,
                    stockQuantity: 0,
                    rate: parseFloat(String(design.base_rate)) || 0,
                };
            });

            const uploadedVariants = await Promise.all(uploadPromises);

            // 5. Bulk insert variants
            const bulkRes = await fetch('/api/catalog/variants/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variants: uploadedVariants })
            });

            if (!bulkRes.ok) throw new Error('Failed to create variants');

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error processing variants');
        } finally {
            setIsProcessing(false);
        }
    };

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className={styles.overlay} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                    <motion.div 
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className={styles.header}>
                            <div>
                                <h2 className={styles.title}>
                                    {step === 1 ? 'Add Variants' : mode === 'single' ? 'Add Single Variant' : 'Extract Variants'}
                                </h2>
                                {step === 2 && mode === 'multiple' && (
                                    <p className={styles.subtitle}>Split master sheet into color variants</p>
                                )}
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                        </div>

                        <div className={styles.body}>
                            {step === 1 && (
                                <div className={styles.typeSelection}>
                                    <p style={{ color: '#475569', marginBottom: '8px' }}>How many variants do you want to add?</p>
                                    
                                    <div 
                                        className={`${styles.typeCard} ${mode === 'single' ? styles.active : ''}`}
                                        onClick={() => setMode('single')}
                                    >
                                        <div className={styles.typeIcon}><ImageIcon size={20} /></div>
                                        <div className={styles.typeInfo}>
                                            <h4>Single Variant</h4>
                                            <p>Upload a standalone image or add a variant manually.</p>
                                        </div>
                                    </div>

                                    <div 
                                        className={`${styles.typeCard} ${mode === 'multiple' ? styles.active : ''}`}
                                        onClick={() => setMode('multiple')}
                                    >
                                        <div className={styles.typeIcon}><Grid3X3 size={20} /></div>
                                        <div className={styles.typeInfo}>
                                            <h4>Multiple Variants from Master Sheet</h4>
                                            <p>Upload a master sheet and extract multiple variants using a grid.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && mode === 'single' && (
                                <div>
                                    {!singleImagePreview ? (
                                        <div className={styles.uploadArea}>
                                            <UploadCloud className={styles.uploadIcon} size={32} />
                                            <p className={styles.uploadText}>Click to upload variant image</p>
                                            <input type="file" accept="image/*" onChange={handleSingleImageSelect} className={styles.fileInput} />
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            <img src={singleImagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Variant" />
                                            <button 
                                                onClick={() => { setSingleImagePreview(null); setSingleImageFile(null); }}
                                                style={{ position: 'absolute', top: 4, right: 4, background: '#fff', borderRadius: '50%', border: 'none', padding: 4, cursor: 'pointer' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <div className={styles.formGroup} style={{ marginTop: '20px' }}>
                                        <label>Variant Code / SKU</label>
                                        <input className={styles.input} value={singleCode} onChange={e => setSingleCode(e.target.value)} placeholder="e.g. 5275-A" />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className={styles.formGroup} style={{ flex: 1 }}>
                                            <label>Initial Stock (Meters)</label>
                                            <input type="number" className={styles.input} value={singleStock} onChange={e => setSingleStock(e.target.value)} placeholder="0" />
                                        </div>
                                        <div className={styles.formGroup} style={{ flex: 1 }}>
                                            <label>Price Rate (₹)</label>
                                            <input type="number" className={styles.input} value={singleRate} onChange={e => setSingleRate(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && mode === 'multiple' && (
                                <div>
                                    {!multiImagePreview ? (
                                        <div className={styles.uploadArea}>
                                            <UploadCloud className={styles.uploadIcon} size={32} />
                                            <p className={styles.uploadText}>Click to upload master sheet</p>
                                            <p className={styles.uploadSubtext}>High resolution JPG/PNG</p>
                                            <input type="file" accept="image/*" onChange={handleMultiImageSelect} className={styles.fileInput} />
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.previewContainer}>
                                                <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                                                    <img src={multiImagePreview} className={styles.previewImage} alt="Master Sheet" />
                                                    <div className={styles.gridOverlay}>
                                                        {Array.from({ length: Math.max(0, rows - 1) }).map((_, i) => (
                                                            <div key={`h-${i}`} className={styles.horizontalLine} style={{ top: `${((i + 1) / rows) * 100}%` }} />
                                                        ))}
                                                        {Array.from({ length: Math.max(0, cols - 1) }).map((_, i) => (
                                                            <div key={`v-${i}`} className={styles.verticalLine} style={{ left: `${((i + 1) / cols) * 100}%` }} />
                                                        ))}
                                                        {Array.from({ length: rows * cols }).map((_, i) => {
                                                            const r = Math.floor(i / cols);
                                                            const c = i % cols;
                                                            const topCenter = ((r + 0.5) / rows) * 100;
                                                            const leftCenter = ((c + 0.5) / cols) * 100;
                                                            return (
                                                                <div 
                                                                    key={`lbl-${i}`} 
                                                                    className={styles.gridLabel}
                                                                    style={{ top: `${topCenter}%`, left: `${leftCenter}%` }}
                                                                >
                                                                    <span className={styles.gridCellIndex}>{String.fromCharCode(65 + i)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className={styles.floatingControls}>
                                                <div className={styles.minimalStepper}>
                                                    <span>Rows</span>
                                                    <button onClick={() => setRows(Math.max(1, rows - 1))}>-</button>
                                                    <strong>{rows}</strong>
                                                    <button onClick={() => setRows(rows + 1)}>+</button>
                                                </div>
                                                <div className={styles.minimalStepper}>
                                                    <span>Columns</span>
                                                    <button onClick={() => setCols(Math.max(1, cols - 1))}>-</button>
                                                    <strong>{cols}</strong>
                                                    <button onClick={() => setCols(cols + 1)}>+</button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.footer}>
                            <div className={styles.footerLeft}>
                                {step === 2 && mode === 'multiple' && multiImagePreview && (
                                    <span>{rows * cols} variants will be created</span>
                                )}
                            </div>
                            
                            <div className={styles.footerRight}>
                                {step === 2 && mode === 'multiple' ? (
                                    <button className={styles.btnSecondary} onClick={onClose} disabled={isProcessing}>
                                        Cancel
                                    </button>
                                ) : step === 2 && mode === 'single' ? (
                                    <button className={styles.btnSecondary} onClick={() => setStep(1)} disabled={isProcessing}>
                                        Back
                                    </button>
                                ) : null}
                                
                                {step === 1 ? (
                                    <button className={styles.btnPrimary} onClick={() => setStep(2)} disabled={!mode}>
                                        Continue <ArrowRight size={16} />
                                    </button>
                                ) : mode === 'single' ? (
                                    <button className={styles.btnPrimary} onClick={handleSaveSingle} disabled={isProcessing}>
                                        {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Variant'}
                                    </button>
                                ) : (
                                    <button className={styles.btnPrimary} onClick={handleSaveMultiple} disabled={!multiImagePreview || isProcessing}>
                                        {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : 'Create Variants'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
