import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
}: ModalProps) {
    const [mounted, setMounted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const modalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.innerWidth > 768) return;
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || window.innerWidth > 768) return;
        const y = e.touches[0].clientY;
        const deltaY = y - startY;
        if (deltaY > 0) {
            setCurrentY(deltaY);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging || window.innerWidth > 768) return;
        setIsDragging(false);
        if (currentY > 150) {
            onClose();
        }
        setCurrentY(0);
    };

    const sheetStyle = isDragging ? { transform: `translate(-50%, -50%) translateY(${currentY}px)`, transition: 'none' } : {};

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                ref={modalContentRef}
                className={styles.modalContent}
                style={isDragging && window.innerWidth <= 768 ? { transform: `translateY(${currentY}px)`, transition: 'none' } : {}}
                onClick={(e) => e.stopPropagation()}
            >
                <div 
                    className={styles.mobileSheetHandle} 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
                {title && (
                    <div className={styles.modalHeader}>
                        <h2 className={styles.modalTitle}>{title}</h2>
                        <button className={styles.closeButton} onClick={onClose}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className={styles.modalBody}>{children}</div>
                {footer && <div className={styles.modalFooter}>{footer}</div>}
            </div>
        </div>,
        document.body
    );
}
