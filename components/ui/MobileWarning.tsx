'use client';

import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

export default function MobileWarning() {
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        const isDismissed = localStorage.getItem('fabric_mobile_warning_dismissed') === 'true';
        
        if (!isDismissed && window.innerWidth <= 1024) {
            setIsVisible(true);
        }

        const handleResize = () => {
            const dismissed = localStorage.getItem('fabric_mobile_warning_dismissed') === 'true';
            if (!dismissed && window.innerWidth <= 1024) {
                setIsVisible(true);
            } else if (window.innerWidth > 1024) {
                setIsVisible(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('fabric_mobile_warning_dismissed', 'true');
        setIsVisible(false);
    };

    if (!mounted || !isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6" style={{ animation: 'fade-in 0.2s ease-out' }}>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-indigo-600" />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                            Desktop Recommended
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            FabricOS is currently optimized for desktop usage. 
                            <br />
                            Mobile support is still under development.
                            <br /><br />
                            For the best experience, please use a laptop or desktop device.
                        </p>
                    </div>

                    <div className="flex flex-col w-full gap-2 pt-2">
                        <button 
                            onClick={handleDismiss}
                            className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg text-sm hover:bg-slate-800 transition-colors"
                        >
                            Continue Anyway
                        </button>
                        <button 
                            onClick={handleDismiss}
                            className="w-full py-2.5 bg-slate-50 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
