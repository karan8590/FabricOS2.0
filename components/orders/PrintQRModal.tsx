import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import styles from './ProductionWorkflowModal.module.css'; // Reuse existing modal styles

interface PrintQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export default function PrintQRModal({ isOpen, onClose, order }: PrintQRModalProps) {
    if (!isOpen || !order) return null;

    const qrUrl = `${window.location.origin}/orders/${order.id}`;

    const handlePrint = () => {
        window.print();
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 100000 }}>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100mm;
                        height: 50mm;
                        margin: 0;
                        padding: 10px;
                        background: white;
                        box-sizing: border-box;
                    }
                    @page {
                        size: 100mm 50mm;
                        margin: 0;
                    }
                }
            `}</style>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className={styles.mobileSheetHandle} />
                <div className={`${styles.modalHeader} no-print`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #E5E7EB' }}>
                    <div>
                        <h2 className={styles.title} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Print QR Label</h2>
                        <p className={styles.subtitle} style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                            Order #{order.order_number || order.id}
                        </p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.formBody} style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Printable Area */}
                    <div id="print-section" style={{ 
                        width: '100mm', 
                        height: '50mm', 
                        border: '1px dashed #ccc', 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        boxSizing: 'border-box',
                        background: '#fff',
                        color: '#000',
                        fontFamily: 'sans-serif',
                        margin: '0 auto',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ flex: '0 0 auto', marginRight: '15px' }}>
                            <QRCodeSVG value={qrUrl} size={100} level="M" />
                        </div>
                        <div style={{ flex: '1 1 auto', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ORD-{order.id}</h2>
                            <div style={{ fontSize: '12px', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Party:</strong> {order.customer_name}</div>
                            <div style={{ fontSize: '12px', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Design:</strong> {order.design_name}</div>
                            <div style={{ fontSize: '12px', marginBottom: '3px' }}><strong>Qty:</strong> {order.quantity_meters}m</div>
                            <div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>FabricOS Internal Label</div>
                        </div>
                    </div>
                    <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '16px', textAlign: 'center' }} className="no-print">
                        Ensure your printer is set to 100mm x 50mm label size.
                    </p>
                </div>

                <div className={`${styles.formFooter} no-print`} style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#F9FAFB', borderRadius: '0 0 12px 12px' }}>
                    <button type="button" className={styles.workflowSecondary} onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className={styles.workflowPrimary} onClick={handlePrint}>
                        <Printer size={16} />
                        Print Label
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
