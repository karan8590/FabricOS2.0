import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Scissors, Printer, Droplets, Package, FileText, Truck, X } from 'lucide-react';
import styles from './BulkActionBar.module.css';

interface BulkActionBarProps {
    selectedOrders: any[];
    activeTab: string;
    onClearSelection: () => void;
    onBulkAction: (actionName: string) => void;
    isSubmitting?: boolean;
}

export default function BulkActionBar({
    selectedOrders,
    activeTab,
    onClearSelection,
    onBulkAction,
    isSubmitting = false
}: BulkActionBarProps) {
    if (selectedOrders.length === 0) return null;

    const totalMeters = selectedOrders.reduce((sum, o) => sum + Number(o.quantity_meters || 0), 0);

    // Dynamic label and icon based on tab
    const getActionConfig = () => {
        switch (activeTab) {
            case 'approval':
                return {
                    label: 'Approve Selected',
                    icon: <Check size={16} />,
                    actionName: 'bulk_approve',
                    style: { background: 'var(--success, #34C759)', boxShadow: '0 2px 8px rgba(52, 199, 89, 0.25)' }
                };
            case 'embroidery':
                return {
                    label: 'Assign Embroidery',
                    icon: <Scissors size={16} />,
                    actionName: 'bulk_embroidery',
                    style: { background: 'var(--warning, #FF9500)', boxShadow: '0 2px 8px rgba(255, 149, 0, 0.25)' }
                };
            case 'printing':
                return {
                    label: 'Send to Dyeing',
                    icon: <Droplets size={16} />,
                    actionName: 'bulk_dyeing',
                    style: { background: 'var(--accent, #0071E3)', boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)' }
                };
            case 'dyeing':
                return {
                    label: 'Mark Ready',
                    icon: <Package size={16} />,
                    actionName: 'bulk_ready',
                    style: { background: 'var(--success, #34C759)', boxShadow: '0 2px 8px rgba(52, 199, 89, 0.25)' }
                };
            case 'ready':
                return {
                    label: 'Dispatch Batch',
                    icon: <Truck size={16} />,
                    actionName: 'bulk_dispatch',
                    style: { background: 'var(--accent, #0071E3)', boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)' }
                };
            case 'delivered':
                return {
                    label: 'Generate Invoices',
                    icon: <FileText size={16} />,
                    actionName: 'bulk_invoice',
                    style: { background: 'var(--success, #34C759)', boxShadow: '0 2px 8px rgba(52, 199, 89, 0.25)' }
                };
            default:
                return null;
        }
    };

    const config = getActionConfig();
    if (!config) return null;

    return (
        <AnimatePresence>
            <motion.div
                className={styles.barContainer}
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
                {/* Left Info summary */}
                <div className={styles.leftInfo}>
                    <span className={styles.selectedCount}>
                        {selectedOrders.length} Order{selectedOrders.length > 1 ? 's' : ''} Selected
                    </span>
                    <span className={styles.metersTotal}>
                        Total Metres: <strong>{totalMeters.toFixed(1)}m</strong>
                    </span>
                </div>

                {/* Right Actions */}
                <div className={styles.actionsGroup}>
                    <button 
                        type="button" 
                        onClick={onClearSelection} 
                        className={styles.clearBtn}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => onBulkAction(config.actionName)}
                        className={styles.actionBtn}
                        style={config.style}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                {config.icon}
                                <span>{config.label}</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
