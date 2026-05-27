'use client';

import React, { memo } from 'react';
import { Package, Edit2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import styles from './CatalogDesignCard.module.css';

export interface DesignMasterSheet {
    id: string;
    design_id: string | number;
    title: string;
    image_url: string;
    extracted_count: number;
    sort_order: number;
}

export interface CatalogVariant {
    id: string | number;
    master_sheet_id?: string;
    color_name: string;
    color_hex: string;
    sku?: string;
    stock_quantity: number;
    rate?: number;
    status: string;
    variant_image_url?: string;
}

export interface CatalogDesign {
    id: string | number;
    design_code: string;
    design_name: string;
    category?: string;
    fabric_type?: string;
    base_rate: number;
    image_url?: string;
    description?: string;
    tags?: string;
    is_active: number;
    variant_count: number;
    total_stock: number;
    preview_variants?: { id: string; color_hex: string; color_name: string }[];
    variants: CatalogVariant[];
}

interface CatalogDesignCardProps {
    design: CatalogDesign;
    isAdmin?: boolean;
    onClick: (design: CatalogDesign) => void;
    onEdit?: (design: CatalogDesign) => void;
    onDelete?: (design: CatalogDesign) => void;
}

const MAX_SWATCHES = 6;

export const CatalogDesignCard = memo(function CatalogDesignCard({
    design,
    isAdmin,
    onClick,
    onEdit,
    onDelete,
}: CatalogDesignCardProps) {
    const swatchesSource = design.preview_variants || design.variants || [];
    const visibleSwatches = swatchesSource.slice(0, MAX_SWATCHES);
    const extraCount = Math.max(0, design.variant_count - MAX_SWATCHES);
    const totalStock = design.total_stock ?? design.variants.reduce((s, v) => s + (v.stock_quantity || 0), 0);
    const isLowStock = totalStock > 0 && totalStock < 100;
    const displayImage = design.image_url;

    return (
        <div className={styles.card} onClick={() => onClick(design)} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onClick(design)}>

            {/* Image */}
            <div className={styles.imageWrap}>
                {displayImage ? (
                    <Image src={displayImage} alt={design.design_name} className={styles.image} fill sizes="(max-width: 768px) 100vw, 300px" />
                ) : (
                    <div className={styles.imagePlaceholder}><Package size={40} /></div>
                )}
                {design.variant_count > 0 && (
                    <div className={styles.variantCount}>{design.variant_count} colors</div>
                )}
                {isLowStock && <div className={styles.lowStockBadge}>Low Stock</div>}
            </div>

            {/* Body */}
            <div className={styles.cardBody}>
                <div className={styles.topRow}>
                    <span className={styles.designCode}>{design.design_code}</span>
                    <span className={styles.category}>{design.category || design.fabric_type || '—'}</span>
                </div>

                <h3 className={styles.designName}>{design.design_name}</h3>

                {/* Color swatches */}
                {design.variant_count > 0 && swatchesSource.length > 0 && (
                    <div className={styles.swatchRow} title={swatchesSource.map(v => v.color_name).join(', ')}>
                        {visibleSwatches.map(v => (
                            <div
                                key={v.id}
                                className={styles.swatch}
                                style={{ background: v.color_hex || '#888' }}
                                title={v.color_name}
                            />
                        ))}
                        {extraCount > 0 && (
                            <span className={styles.swatchMore}>+{extraCount}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={styles.cardFooter}>
                <div className={styles.stockInfo}>
                    <div className={styles.stockDot} style={{ background: totalStock > 100 ? '#10b981' : totalStock > 0 ? '#f59e0b' : '#ef4444' }} />
                    <span>{totalStock > 0 ? `${totalStock.toLocaleString('en-IN')}m` : 'No stock'}</span>
                </div>
                {design.base_rate > 0 && (
                    <span className={styles.baseRate}>
                        ₹{design.base_rate.toLocaleString('en-IN')}<span className={styles.rateUnit}>/m</span>
                    </span>
                )}
            </div>

            {/* Admin actions */}
            {isAdmin && (
                <div className={styles.adminRow} onClick={e => e.stopPropagation()}>
                    {onEdit && (
                        <button className={styles.btnEdit} onClick={() => onEdit(design)}>
                            <Edit2 size={12} /> Edit
                        </button>
                    )}
                    {onDelete && (
                        <button className={styles.btnDelete} onClick={() => onDelete(design)}>
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

export default CatalogDesignCard;
