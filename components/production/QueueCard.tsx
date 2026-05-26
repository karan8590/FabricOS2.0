import React, { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Check, Scissors, Printer, Droplets, Package, FileText, Truck, Eye } from 'lucide-react';
import styles from './QueueCard.module.css';

interface QueueCardProps {
    order: {
        id: number;
        order_number: string;
        customer_name: string;
        design_name: string;
        quantity_meters: number;
        order_stage: string;
        embroidery_status?: string;
        printing_status?: string;
        dyeing_status?: string;
        total_price?: number;
    };
    isSelected: boolean;
    onSelectToggle: () => void;
    activeTab: string;
    onPrimaryAction: (order: any) => void;
    onSecondaryAction?: (order: any) => void;
    onViewDetails?: (orderId: number) => void;
}

export default function QueueCard({
    order,
    isSelected,
    onSelectToggle,
    activeTab,
    onPrimaryAction,
    onSecondaryAction,
    onViewDetails
}: QueueCardProps) {
    const controls = useAnimation();
    const [swipeState, setSwipeState] = useState<'neutral' | 'left' | 'right'>('neutral');

    // Configure stage details & labels based on active tab
    const getStageConfig = () => {
        switch (activeTab) {
            case 'approval':
                return {
                    primaryLabel: 'Approve',
                    primaryBg: 'var(--success, #34C759)',
                    primaryIcon: <Check size={16} />,
                    secondaryLabel: null,
                    secondaryBg: '',
                    secondaryIcon: null,
                    statusText: 'Pending Approval',
                    statusColor: '#F59E0B',
                    stageColor: '#F59E0B',
                    stageBg: 'rgba(245, 158, 11, 0.08)'
                };
            case 'embroidery':
                return {
                    primaryLabel: 'Mark Printing',
                    primaryBg: 'var(--warning, #FF9500)',
                    primaryIcon: <Printer size={16} />,
                    secondaryLabel: 'Send to Vendor',
                    secondaryBg: 'var(--accent, #5856D6)',
                    secondaryIcon: <Scissors size={16} />,
                    statusText: order.embroidery_status === 'queued_delivery' 
                        ? 'Queued for Vendor' 
                        : order.embroidery_status === 'in_progress' 
                            ? 'At Vendor' 
                            : 'Pending Embroidery',
                    statusColor: '#8B5CF6',
                    stageColor: '#7C3AED',
                    stageBg: 'rgba(139, 92, 246, 0.08)'
                };
            case 'printing':
                return {
                    primaryLabel: 'Send Dyeing',
                    primaryBg: 'var(--accent, #0071E3)',
                    primaryIcon: <Droplets size={16} />,
                    secondaryLabel: null,
                    secondaryBg: '',
                    secondaryIcon: null,
                    statusText: 'In Printing',
                    statusColor: '#EA580C',
                    stageColor: '#C2410C',
                    stageBg: 'rgba(249, 115, 22, 0.08)'
                };
            case 'dyeing':
                return {
                    primaryLabel: 'Mark Ready',
                    primaryBg: 'var(--success, #34C759)',
                    primaryIcon: <Package size={16} />,
                    secondaryLabel: 'Send to Vendor',
                    secondaryBg: 'var(--accent, #0071E3)',
                    secondaryIcon: <Droplets size={16} />,
                    statusText: order.dyeing_status === 'queued_delivery'
                        ? 'Queued for Dyeing'
                        : order.dyeing_status === 'in_progress'
                            ? 'At Dyeing Vendor'
                            : 'Pending Dyeing',
                    statusColor: '#0284C7',
                    stageColor: '#0369A1',
                    stageBg: 'rgba(14, 165, 233, 0.08)'
                };
            case 'ready':
                return {
                    primaryLabel: 'Dispatch',
                    primaryBg: 'var(--accent, #0071E3)',
                    primaryIcon: <Truck size={16} />,
                    secondaryLabel: null,
                    secondaryBg: '',
                    secondaryIcon: null,
                    statusText: 'Ready for Dispatch',
                    statusColor: '#16A34A',
                    stageColor: '#047857',
                    stageBg: 'rgba(16, 185, 129, 0.08)'
                };
            case 'delivered':
                return {
                    primaryLabel: 'Invoice',
                    primaryBg: 'var(--success, #34C759)',
                    primaryIcon: <FileText size={16} />,
                    secondaryLabel: null,
                    secondaryBg: '',
                    secondaryIcon: null,
                    statusText: order.order_stage === 'invoiced' ? 'Invoiced' : 'Delivered',
                    statusColor: '#6B7280',
                    stageColor: '#4B5563',
                    stageBg: 'rgba(75, 85, 99, 0.08)'
                };
            default:
                return {
                    primaryLabel: 'Advance',
                    primaryBg: 'var(--accent, #0071E3)',
                    primaryIcon: <Check size={16} />,
                    secondaryLabel: null,
                    secondaryBg: '',
                    secondaryIcon: null,
                    statusText: order.order_stage,
                    statusColor: '#6B7280',
                    stageColor: '#6B7280',
                    stageBg: 'rgba(107, 114, 128, 0.08)'
                };
        }
    };

    const config = getStageConfig();

    // Reset card translation
    const resetPosition = () => {
        controls.start({ x: 0 });
        setSwipeState('neutral');
    };

    // Handle drag end to snap card and set state
    const handleDragEnd = (event: any, info: any) => {
        const threshold = 70; // drag distance required to snap/reveal
        if (info.offset.x > threshold && config.primaryLabel) {
            // Dragged right -> reveals left action
            controls.start({ x: 90 });
            setSwipeState('right');
        } else if (info.offset.x < -threshold && config.secondaryLabel) {
            // Dragged left -> reveals right action
            controls.start({ x: -110 });
            setSwipeState('left');
        } else {
            // Did not exceed threshold
            resetPosition();
        }
    };

    return (
        <div className={styles.cardContainer}>
            {/* Background Actions Revealed on Swipe */}
            <div 
                className={styles.actionBackground}
                style={{
                    background: swipeState === 'right' 
                        ? config.primaryBg 
                        : swipeState === 'left' 
                            ? config.secondaryBg 
                            : 'var(--bg-grouped, #F3F4F6)'
                }}
            >
                {/* Left Action (Primary action revealed by swiping right) */}
                <div className={styles.actionLeft}>
                    {config.primaryIcon}
                    {swipeState === 'right' ? (
                        <button 
                            className={styles.revealedActionBtn}
                            onClick={() => {
                                onPrimaryAction(order);
                                resetPosition();
                            }}
                        >
                            {config.primaryLabel}
                        </button>
                    ) : (
                        <span>{config.primaryLabel}</span>
                    )}
                </div>

                {/* Right Action (Secondary action revealed by swiping left) */}
                <div className={styles.actionRight}>
                    {swipeState === 'left' && config.secondaryLabel ? (
                        <button 
                            className={styles.revealedActionBtn}
                            onClick={() => {
                                if (onSecondaryAction) onSecondaryAction(order);
                                resetPosition();
                            }}
                        >
                            {config.secondaryLabel}
                        </button>
                    ) : (
                        <span>{config.secondaryLabel}</span>
                    )}
                    {config.secondaryIcon}
                </div>
            </div>

            {/* Main Interactive Card */}
            <motion.div
                className={`${styles.card} ${isSelected ? styles.selectedCard : ''}`}
                drag="x"
                dragDirectionLock
                dragConstraints={{ 
                    left: config.secondaryLabel ? -120 : 0, 
                    right: config.primaryLabel ? 100 : 0 
                }}
                animate={controls}
                onDragEnd={handleDragEnd}
                onClick={() => {
                    // Clicking the card when swiped snaps it back
                    if (swipeState !== 'neutral') {
                        resetPosition();
                    } else if (onViewDetails) {
                        onViewDetails(order.id);
                    }
                }}
            >
                {/* Multi-Select Checkbox */}
                <div className={styles.checkboxContainer} onClick={(e) => e.stopPropagation()}>
                    <button
                        className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ''}`}
                        onClick={onSelectToggle}
                        aria-label={isSelected ? "Deselect order" : "Select order"}
                    >
                        {isSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
                    </button>
                </div>

                {/* Card Content */}
                <div className={styles.content}>
                    <div className={styles.header}>
                        <span className={styles.customer}>{order.customer_name}</span>
                        <span className={styles.orderNo}>{order.order_number || `#${order.id}`}</span>
                    </div>

                    <div className={styles.details}>
                        <span>{order.design_name}</span>
                        <span>·</span>
                        <span className={styles.qtyChip}>
                            {parseFloat(String(order.quantity_meters)).toFixed(1)}m
                        </span>
                    </div>

                    {/* Stage & Status Badge */}
                    <div className={styles.statusIndicator} style={{ color: config.statusColor }}>
                        <span 
                            style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: config.statusColor
                            }}
                        />
                        {config.statusText}
                    </div>
                </div>

                {/* View details quick-btn */}
                {onViewDetails && (
                    <div 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            paddingLeft: '8px', 
                            color: 'var(--text-tertiary, #9CA3AF)',
                            cursor: 'pointer'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(order.id);
                        }}
                    >
                        <Eye size={18} />
                    </div>
                )}
            </motion.div>
        </div>
    );
}
