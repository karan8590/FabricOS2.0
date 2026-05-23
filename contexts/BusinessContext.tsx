'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface BusinessContextType {
    activeBusinessId: string | null;
    isSuperAdminViewing: boolean;
    setSuperAdminViewingBusinessId: (businessId: string | null) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    
    // Super admins can set this to "enter" a business
    const [superAdminViewingBusinessId, setSuperAdminViewingBusinessId] = useState<string | null>(null);

    // Initialize from local storage if super admin
    useEffect(() => {
        if (user?.isSuperAdmin) {
            const saved = localStorage.getItem('superAdminViewingBusinessId');
            if (saved) {
                setSuperAdminViewingBusinessId(saved);
            }
        } else {
            setSuperAdminViewingBusinessId(null);
            localStorage.removeItem('superAdminViewingBusinessId');
        }
    }, [user]);

    // Handle updates
    const handleSetSuperAdminViewingBusinessId = (businessId: string | null) => {
        if (!user?.isSuperAdmin) return;
        
        setSuperAdminViewingBusinessId(businessId);
        if (businessId) {
            localStorage.setItem('superAdminViewingBusinessId', businessId);
        } else {
            localStorage.removeItem('superAdminViewingBusinessId');
        }
    };

    // Determine the active business ID
    let activeBusinessId = null;
    if (user?.isSuperAdmin) {
        activeBusinessId = superAdminViewingBusinessId || 'super_admin';
    } else if (user?.businessId) {
        activeBusinessId = user.businessId;
    }

    const isSuperAdminViewing = user?.isSuperAdmin && superAdminViewingBusinessId !== null;

    return (
        <BusinessContext.Provider value={{
            activeBusinessId,
            isSuperAdminViewing: !!isSuperAdminViewing,
            setSuperAdminViewingBusinessId: handleSetSuperAdminViewingBusinessId
        }}>
            {children}
            
            {/* Persistent Banner for Super Admin Viewing Business */}
            {isSuperAdminViewing && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: '#FCD34D', color: '#92400E', padding: '8px 16px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontWeight: 600, fontSize: '14px', gap: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <span>Viewing as: {activeBusinessId}</span>
                    <button 
                        onClick={() => handleSetSuperAdminViewingBusinessId(null)}
                        style={{
                            background: '#B45309', color: 'white', border: 'none',
                            padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
                            cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        Exit
                    </button>
                </div>
            )}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (!context) {
        throw new Error('useBusiness must be used within BusinessProvider');
    }
    return context;
}
