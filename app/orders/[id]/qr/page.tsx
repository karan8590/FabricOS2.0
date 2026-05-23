'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useParams } from 'next/navigation';

export default function OrderQRPage() {
    const params = useParams();
    const id = params.id as string;
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetch(`/api/orders/${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.id) {
                        setOrder(data);
                    } else {
                        setError(data.error || 'Failed to load order data');
                    }
                })
                .catch(err => {
                    setError('Network error');
                });
        }
    }, [id]);

    useEffect(() => {
        if (order) {
            // Auto-trigger print dialog after a slight delay to ensure render
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [order]);

    if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
    if (!order) return <div style={{ padding: '20px' }}>Loading order data...</div>;

    // The URL embedded in the QR
    const qrUrl = `${window.location.origin}/orders/${id}`;

    return (
        <>
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
                    }
                    @page {
                        size: 100mm 50mm;
                        margin: 0;
                    }
                }
            `}</style>
            
            <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                <p style={{ color: '#666', marginBottom: '20px' }} className="no-print">
                    This page will print automatically. If it doesn't, press Ctrl+P or Cmd+P.
                </p>
                
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
                    fontFamily: 'sans-serif'
                }}>
                    <div style={{ flex: '0 0 auto', marginRight: '15px' }}>
                        <QRCodeSVG value={qrUrl} size={100} level="M" />
                    </div>
                    <div style={{ flex: '1 1 auto', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>ORD-{order.id}</h2>
                        <div style={{ fontSize: '12px', marginBottom: '3px' }}><strong>Party:</strong> {order.customer_name}</div>
                        <div style={{ fontSize: '12px', marginBottom: '3px' }}><strong>Design:</strong> {order.design_name}</div>
                        <div style={{ fontSize: '12px', marginBottom: '3px' }}><strong>Qty:</strong> {order.quantity_meters}m</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>FabricOS Internal Label</div>
                    </div>
                </div>
            </div>
        </>
    );
}
