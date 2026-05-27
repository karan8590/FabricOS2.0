'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './MobileBottomSheet.module.css';

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    isMobileOnly?: boolean; // If true, only applies bottom sheet styling on mobile and leaves desktop as is
}

export default function MobileBottomSheet({ isOpen, onClose, children, title, isMobileOnly = false }: MobileBottomSheetProps) {
    const [mounted, setMounted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const y = e.touches[0].clientY;
        const deltaY = y - startY;
        if (deltaY > 0) {
            setCurrentY(deltaY);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (currentY > 150) {
            onClose();
        }
        setCurrentY(0);
    };

    const sheetStyle = isDragging ? { transform: `translateY(${currentY}px)`, transition: 'none' } : {};

    const content = (
        <div className={`${styles.overlay} ${isMobileOnly ? styles.mobileOnly : ''}`}>
            <div className={styles.backdrop} onClick={onClose} />
            <div 
                className={styles.sheet} 
                ref={sheetRef}
                style={sheetStyle}
            >
                <div 
                    className={styles.handleWrapper}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={styles.handle} />
                </div>
                {title && (
                    <div className={styles.header}>
                        <h2 className={styles.title}>{title}</h2>
                    </div>
                )}
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
