import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { X, Camera, QrCode, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

type ScannerState = 'idle' | 'waiting_permission' | 'loading' | 'scanning' | 'success' | 'error';

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [activeCamera, setActiveCamera] = useState<string>('');
    const [scannerState, setScannerState] = useState<ScannerState>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initialize HTML5 QR Code instance
    useEffect(() => {
        if (!isOpen || !mounted) return;

        let isCleanedUp = false;

        const initScanner = () => {
            if (isCleanedUp) return;
            try {
                if (!document.getElementById('custom-qr-reader')) {
                    console.warn("custom-qr-reader element not found yet");
                    return;
                }

                scannerRef.current = new Html5Qrcode('custom-qr-reader', {
                    verbose: false
                });

                // Try to get cameras right away if possible
                Html5Qrcode.getCameras().then(devices => {
                    if (isCleanedUp) return;
                    if (devices && devices.length > 0) {
                        setCameras(devices);
                        const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
                        setActiveCamera(backCamera ? backCamera.id : devices[0].id);
                    }
                }).catch(err => {
                    console.error("Error getting cameras", err);
                });
            } catch (err) {
                console.error("Failed to initialize Html5Qrcode:", err);
            }
        };

        // Defer slightly to ensure the portal is fully mounted in the DOM
        const timer = setTimeout(initScanner, 50);

        return () => {
            isCleanedUp = true;
            clearTimeout(timer);
            try {
                if (scannerRef.current?.isScanning) {
                    scannerRef.current.stop().catch(console.error).finally(() => {
                        scannerRef.current?.clear();
                    });
                } else {
                    scannerRef.current?.clear();
                }
            } catch (err) {
                console.error("Cleanup error:", err);
            }
        };
    }, [isOpen, mounted]);

    const stopScan = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
                setScannerState('idle');
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
    }, []);

    const startScan = useCallback(async () => {
        if (!scannerRef.current) return;
        
        try {
            setScannerState('waiting_permission');
            
            const cameraConfig = activeCamera ? activeCamera : { facingMode: { ideal: "environment" } };
            
            await scannerRef.current.start(
                cameraConfig,
                { 
                    fps: 10,
                    disableFlip: true
                },
                (decodedText) => {
                    // Success callback
                    if (scannerRef.current?.isScanning) {
                        setScannerState('success');
                        setTimeout(() => {
                            stopScan().then(() => {
                                onClose();
                                onScan(decodedText);
                                setScannerState('idle');
                            });
                        }, 800);
                    }
                },
                (error) => {
                    // Ignore noisy QR reading errors
                }
            );
            
            setScannerState('scanning');
        } catch (err: any) {
            console.error("Error starting scan", err);
            setScannerState('error');
            setErrorMessage(err?.message || "Could not start camera. Please check permissions.");
        }
    }, [activeCamera, stopScan, onClose, onScan]);

    const handleClose = useCallback(() => {
        if (scannerRef.current?.isScanning) {
            stopScan().then(() => onClose());
        } else {
            onClose();
        }
    }, [stopScan, onClose]);

    // Handle body lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setScannerState('idle');
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="scanner-dialog-overlay" role="dialog" aria-modal="true">
            <style>{`
                .scanner-dialog-overlay {
                    position: fixed !important;
                    inset: 0 !important;
                    z-index: 99999 !important;
                    background: rgba(15,23,42,0.45) !important;
                    backdrop-filter: blur(6px) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .scanner-modal {
                    width: 500px !important;
                    max-width: 92vw !important;
                    padding: 24px !important;
                    background: #FFFFFF !important;
                    border-radius: 24px !important;
                    overflow: hidden !important;
                    position: relative !important;
                    box-shadow: 0 24px 80px rgba(15,23,42,0.16) !important;
                }

                .scanner-viewport {
                    width: 100% !important;
                    height: 240px !important;
                    overflow: hidden !important;
                    border-radius: 20px !important;
                    background: #F8FAFC !important;
                    border: 1px solid #E5E7EB !important;
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .memoizedScanner {
                    contain: layout paint size;
                }

                .scanner-viewport video {
                    transform: none !important;
                    scale: 1 !important;
                    rotate: 0deg !important;
                    object-fit: cover !important;
                    backface-visibility: hidden !important;
                    will-change: auto !important;
                }

                .scanner-viewport canvas,
                .scanner-viewport > svg {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    transform: none !important;
                    max-width: none !important;
                    max-height: none !important;
                    display: block !important;
                }

                .scanner-placeholder svg,
                .scanner-placeholder img {
                    width: 120px !important;
                    height: 120px !important;
                    max-width: 120px !important;
                    max-height: 120px !important;
                }
            `}</style>

            <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', borderRadius: '8px', marginTop: '2px' }}>
                            <QrCode style={{ width: '16px', height: '16px', color: '#4B5563' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', lineHeight: 1.1, margin: 0 }}>Scan QR</h2>
                            <p style={{ fontSize: '14px', color: '#6B7280', margin: '6px 0 0 0' }}>Scan printed order labels instantly</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        style={{ width: '36px', height: '36px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', transition: 'background 0.2s', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#F3F4F6'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <X style={{ width: '18px', height: '18px' }} />
                    </button>
                </div>

                {/* ScannerViewport */}
                <div className="scanner-viewport">
                    <div id="custom-qr-reader" className="memoizedScanner" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

                    {/* States Overlay */}
                    {scannerState === 'idle' && (
                        <div className="scanner-placeholder" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#F8FAFC', zIndex: 10 }}>
                            <Camera style={{ color: '#9CA3AF', opacity: 0.45 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: 0 }}>Ready to scan</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Position the QR code within the frame</p>
                            </div>
                        </div>
                    )}

                    {scannerState === 'waiting_permission' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#F8FAFC', zIndex: 10 }}>
                            <Loader2 style={{ width: '40px', height: '40px', color: '#3B82F6' }} className="animate-spin" />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: 0 }}>Starting camera...</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Please allow camera permissions</p>
                            </div>
                        </div>
                    )}

                    {scannerState === 'scanning' && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', borderTop: '3px solid #3B82F6', borderLeft: '3px solid #3B82F6', borderRadius: '8px 0 0 0' }} />
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '24px', height: '24px', borderTop: '3px solid #3B82F6', borderRight: '3px solid #3B82F6', borderRadius: '0 8px 0 0' }} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px', borderBottom: '3px solid #3B82F6', borderLeft: '3px solid #3B82F6', borderRadius: '0 0 0 8px' }} />
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderBottom: '3px solid #3B82F6', borderRight: '3px solid #3B82F6', borderRadius: '0 0 8px 0' }} />
                                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: '#3B82F6', boxShadow: '0 0 8px 2px rgba(59,130,246,0.5)', width: '100%' }} />
                            </div>
                            <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                        </div>
                    )}

                    {scannerState === 'success' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#10B981', zIndex: 20 }}>
                            <CheckCircle2 style={{ width: '64px', height: '64px', color: '#FFFFFF', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Scanned!</h3>
                        </div>
                    )}

                    {scannerState === 'error' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#FEF2F2', zIndex: 10, padding: '24px', textAlign: 'center' }}>
                            <AlertCircle style={{ width: '48px', height: '48px', color: '#EF4444' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: 0 }}>Camera Error</h3>
                                <p style={{ fontSize: '14px', color: '#B91C1C', margin: 0 }}>{errorMessage}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Camera Select */}
                {cameras.length > 0 && (
                    <div style={{ marginTop: '16px', position: 'relative' }}>
                        <select
                            value={activeCamera}
                            onChange={(e) => setActiveCamera(e.target.value)}
                            disabled={scannerState === 'scanning' || scannerState === 'waiting_permission'}
                            style={{
                                width: '100%',
                                height: '44px',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                background: '#FFFFFF',
                                padding: '0 40px 0 16px',
                                fontSize: '14px',
                                color: '#374151',
                                appearance: 'none',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {cameras.map(camera => (
                                <option key={camera.id} value={camera.id}>
                                    {camera.label || `Camera ${camera.id}`}
                                </option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <svg style={{ width: '16px', height: '16px', color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                )}

                {/* Bottom Actions */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                        onClick={handleClose}
                        style={{
                            height: '44px',
                            padding: '0 20px',
                            borderRadius: '12px',
                            background: '#F3F4F6',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#E5E7EB'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    >
                        Cancel
                    </button>

                    {scannerState === 'scanning' ? (
                        <button 
                            onClick={stopScan}
                            style={{
                                height: '44px',
                                padding: '0 20px',
                                minWidth: '140px',
                                borderRadius: '12px',
                                background: '#EF4444',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#DC2626'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#EF4444'}
                        >
                            Stop Scanning
                        </button>
                    ) : (
                        <button 
                            onClick={startScan}
                            disabled={scannerState === 'waiting_permission'}
                            style={{
                                height: '44px',
                                padding: '0 24px',
                                minWidth: '140px',
                                borderRadius: '12px',
                                background: '#3B82F6',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: scannerState === 'waiting_permission' ? 'not-allowed' : 'pointer',
                                opacity: scannerState === 'waiting_permission' ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (scannerState !== 'waiting_permission') {
                                    e.currentTarget.style.background = '#2563EB';
                                }
                            }}
                            onMouseOut={(e) => e.currentTarget.style.background = '#3B82F6'}
                        >
                            <Camera style={{ width: '16px', height: '16px' }} />
                            {scannerState === 'waiting_permission' ? 'Starting...' : 'Start Camera'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
