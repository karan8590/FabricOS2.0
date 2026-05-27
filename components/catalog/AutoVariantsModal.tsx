'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Grid3X3, Trash2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import styles from './AutoVariantsModal.module.css';
import type { CatalogDesign, DesignMasterSheet } from './CatalogDesignCard';

interface AutoVariantsModalProps {
    design: CatalogDesign;
    masterSheets: DesignMasterSheet[];
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface CropPreview {
    id: string;
    blob: Blob;
    dataUrl: string;
    colorName: string;
    colorHex: string;
    sku: string;
    stock: string;
    rate: string;
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

export default function AutoVariantsModal({ design, masterSheets, isOpen, onClose, onSuccess }: AutoVariantsModalProps) {
    const [step, setStep] = useState<0 | 1 | 2>(0);
    const [selectedSheetId, setSelectedSheetId] = useState<string>('');
    const [rows, setRows] = useState(2);
    const [cols, setCols] = useState(2);
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
    const [crops, setCrops] = useState<CropPreview[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Canvas ref for visual grid overlay (optional) but we just do the logic directly
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setStep(0);
            setCrops([]);
            setRows(2);
            setCols(2);
            setSelectedSheetId('');
        } else {
            if (masterSheets.length > 0) {
                setSelectedSheetId(masterSheets[0].id);
            }
            setStep(0);
        }
    }, [isOpen, masterSheets]);

    useEffect(() => {
        if (selectedSheetId) {
            const sheet = masterSheets.find(s => s.id === selectedSheetId);
            if (sheet) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => setImageObj(img);
                img.src = sheet.image_url;
            }
        }
    }, [selectedSheetId, masterSheets]);

    const handleUploadMasterSheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!uploadRes.ok) throw new Error('Upload failed');
            const { url } = await uploadRes.json();
            
            const res = await fetch(`/api/catalog/designs/${design.id}/master-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'New Master Sheet',
                    imageUrl: url,
                })
            });

            if (!res.ok) throw new Error('Failed to save master sheet');
            
            onSuccess(); // Trigger a refresh in the parent modal
            // We wait for parent to pass down new masterSheets, but it's tricky.
            // A better way is to call onSuccess() which closes AutoVariantsModal for now,
            // or we could just set selectedSheetId... but let's just close and let them reopen.
        } catch (error: any) {
            console.error(error);
            alert('Failed to upload master sheet.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSplit = async () => {
        if (!imageObj) return;
        setIsProcessing(true);
        
        const newCrops: CropPreview[] = [];
        const cropWidth = imageObj.width / cols;
        const cropHeight = imageObj.height / rows;

        let counter = 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const canvas = document.createElement('canvas');
                canvas.width = cropWidth;
                canvas.height = cropHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                // Draw specific slice
                ctx.drawImage(
                    imageObj,
                    c * cropWidth, r * cropHeight, cropWidth, cropHeight,
                    0, 0, cropWidth, cropHeight
                );

                const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9));
                if (blob) {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    const letter = String.fromCharCode(64 + counter);
                    const dominantHex = getDominantColor(canvas, ctx);
                    
                    newCrops.push({
                        id: `crop_${r}_${c}`,
                        blob,
                        dataUrl,
                        colorName: `${design.design_code}-${letter}`,
                        colorHex: dominantHex,
                        sku: `${design.design_code}-${letter}`,
                        stock: '',
                        rate: String(design.base_rate || ''),
                    });
                    counter++;
                }
            }
        }
        
        setCrops(newCrops);
        setIsProcessing(false);
        setStep(2);
    };

    const handleCropChange = (id: string, field: keyof CropPreview, value: string) => {
        setCrops(prev => prev.map(crop => crop.id === id ? { ...crop, [field]: value } : crop));
    };

    const handleRemoveCrop = (id: string) => {
        setCrops(prev => prev.filter(crop => crop.id !== id));
    };

    const handleSubmit = async () => {
        if (crops.length === 0) return;
        setIsProcessing(true);
        
        try {
            const variantsToCreate = [];
            
            // 1. Upload each cropped image sequentially (or via Promise.all)
            // Sequential is safer for rate limits, but Promise.all is faster. We'll use Promise.all.
            const uploadPromises = crops.map(async (crop) => {
                const fd = new FormData();
                fd.append('file', crop.blob, `${crop.sku}.jpg`);
                
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!uploadRes.ok) throw new Error(`Upload failed for ${crop.colorName}`);
                const { url } = await uploadRes.json();
                
                return {
                    designId: design.id,
                    masterSheetId: selectedSheetId,
                    colorName: crop.colorName,
                    colorHex: crop.colorHex,
                    sku: crop.sku,
                    variantImage: url,
                    stockQuantity: parseFloat(crop.stock) || 0,
                    rate: parseFloat(crop.rate) || 0,
                };
            });

            const uploadedVariants = await Promise.all(uploadPromises);

            // 2. Submit bulk variants
            const res = await fetch('/api/catalog/variants/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variants: uploadedVariants })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create variants');
            }

            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'An error occurred during submission.');
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    key="auto-variants-overlay"
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
                        <div>
                            <h2>Auto-Create Variants</h2>
                            <p className={styles.subtitle}>{design.design_name} ({design.design_code})</p>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose} disabled={isProcessing}><X size={20} /></button>
                    </div>

                    <div className={styles.body}>
                        {step === 0 && (
                            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                <Grid3X3 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Select Master Sheet</h3>
                                
                                {masterSheets.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <select 
                                            value={selectedSheetId} 
                                            onChange={e => setSelectedSheetId(e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '12px', width: '100%', maxWidth: '300px' }}
                                        >
                                            <option value="" disabled>Select a sheet</option>
                                            {masterSheets.map(s => (
                                                <option key={s.id} value={s.id}>{s.title}</option>
                                            ))}
                                        </select>
                                        <br />
                                        <button 
                                            className={styles.btnOutline}
                                            onClick={() => setStep(1)}
                                            disabled={!selectedSheetId}
                                            style={{ padding: '8px 24px', background: '#0f172a', color: '#fff' }}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                )}
                                
                                <p style={{ color: '#64748b', fontSize: 14, marginBottom: '16px' }}>
                                    OR
                                </p>
                                
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f1f5f9', color: '#0f172a', borderRadius: 8, cursor: 'pointer', fontWeight: 500, border: '1px solid #cbd5e1' }}>
                                    {isProcessing ? <Loader2 size={16} className={styles.spin} /> : 'Upload New Master Sheet'}
                                    <input 
                                        type="file" 
                                        style={{ display: 'none' }} 
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleUploadMasterSheet}
                                        disabled={isProcessing}
                                    />
                                </label>
                            </div>
                        )}
                        {step === 1 && (
                            <div className={styles.step1Container}>
                                <div className={styles.imagePreviewWrap}>
                                    {imageObj ? (
                                        <div className={styles.gridOverlayWrapper}>
                                            <img src={imageObj.src} alt="Master Sheet" className={styles.masterImage} />
                                            <div 
                                                className={styles.gridLines}
                                                style={{
                                                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                                                    gridTemplateColumns: `repeat(${cols}, 1fr)`
                                                }}
                                            >
                                                {Array.from({ length: rows * cols }).map((_, i) => (
                                                    <div key={i} className={styles.gridCell} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.noImage}>
                                            <p>No master image found for this sheet.</p>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.controlsPanel}>
                                    <div className={styles.controlGroup}>
                                        <label>Rows</label>
                                        <div className={styles.counter}>
                                            <button onClick={() => setRows(r => Math.max(1, r - 1))}>-</button>
                                            <span>{rows}</span>
                                            <button onClick={() => setRows(r => Math.min(20, r + 1))}>+</button>
                                        </div>
                                    </div>
                                    <div className={styles.controlGroup}>
                                        <label>Columns</label>
                                        <div className={styles.counter}>
                                            <button onClick={() => setCols(c => Math.max(1, c - 1))}>-</button>
                                            <span>{cols}</span>
                                            <button onClick={() => setCols(c => Math.min(20, c + 1))}>+</button>
                                        </div>
                                    </div>
                                    <p className={styles.gridHelp}>
                                        This will split the image into <strong>{rows * cols}</strong> distinct variants.
                                    </p>
                                    <button 
                                        className={styles.btnSplit} 
                                        onClick={handleSplit}
                                        disabled={!imageObj || isProcessing}
                                    >
                                        {isProcessing ? <Loader2 size={16} className={styles.spin} /> : <Grid3X3 size={16} />}
                                        Split Grid
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className={styles.step2Container}>
                                <div className={styles.reviewHeader}>
                                    <p>Review and edit extracted variants ({crops.length})</p>
                                    <button className={styles.btnBack} onClick={() => setStep(1)} disabled={isProcessing}>
                                        Back to Grid
                                    </button>
                                </div>
                                
                                <div className={styles.cropsGrid}>
                                    {crops.map((crop, idx) => (
                                        <div key={crop.id} className={styles.cropCard}>
                                            <div className={styles.cropImageWrap}>
                                                <img src={crop.dataUrl} alt={crop.colorName} />
                                                <button className={styles.btnRemoveCrop} onClick={() => handleRemoveCrop(crop.id)} title="Remove this crop">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className={styles.cropInputs}>
                                                <div className={styles.inputGroupRow}>
                                                    <div className={styles.inputGroup}>
                                                        <label>Color Name *</label>
                                                        <input 
                                                            value={crop.colorName} 
                                                            onChange={e => handleCropChange(crop.id, 'colorName', e.target.value)} 
                                                            placeholder="e.g. Red"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>HEX</label>
                                                        <div className={styles.colorInputWrap}>
                                                            <input 
                                                                type="color" 
                                                                value={crop.colorHex} 
                                                                onChange={e => handleCropChange(crop.id, 'colorHex', e.target.value)}
                                                                className={styles.colorPicker}
                                                            />
                                                            <input 
                                                                value={crop.colorHex} 
                                                                onChange={e => handleCropChange(crop.id, 'colorHex', e.target.value)} 
                                                                placeholder="#000000"
                                                                className={styles.colorHexInput}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.inputGroupRow}>
                                                    <div className={styles.inputGroup}>
                                                        <label>SKU</label>
                                                        <input 
                                                            value={crop.sku} 
                                                            onChange={e => handleCropChange(crop.id, 'sku', e.target.value)} 
                                                            placeholder="Code"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>Stock</label>
                                                        <input 
                                                            type="number"
                                                            value={crop.stock} 
                                                            onChange={e => handleCropChange(crop.id, 'stock', e.target.value)} 
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {step === 2 && (
                        <div className={styles.footer}>
                            <button className={styles.btnCancel} onClick={onClose} disabled={isProcessing}>Cancel</button>
                            <button 
                                className={styles.btnSubmit} 
                                onClick={handleSubmit} 
                                disabled={isProcessing || crops.length === 0}
                            >
                                {isProcessing ? (
                                    <><Loader2 size={16} className={styles.spin} /> Processing...</>
                                ) : (
                                    <><CheckCircle2 size={16} /> Create {crops.length} Variants</>
                                )}
                            </button>
                        </div>
                    )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
