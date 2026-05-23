import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import styles from '@/app/telegram-center/TelegramCenter.module.css';

interface SetupProgressHeaderProps {
    currentStep: number;
    totalSteps: number;
    isActivated: boolean;
}

export function SetupProgressHeader({ currentStep, totalSteps, isActivated }: SetupProgressHeaderProps) {
    const percentage = isActivated ? 100 : Math.round(((currentStep - 1) / totalSteps) * 100);

    return (
        <div className={styles.card} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Telegram Setup Progress</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Complete the steps below to activate automation</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isActivated ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#E8F5E9', color: '#2E7D32', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                            <CheckCircle2 size={16} /> Complete
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFF9E6', color: '#F59E0B', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                            <Clock size={16} /> {percentage}% Pending
                        </div>
                    )}
                </div>
            </div>

            <div style={{ height: '8px', background: 'var(--bg-grouped)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                    height: '100%', 
                    background: isActivated ? '#10B981' : 'var(--accent)', 
                    width: `${percentage}%`,
                    transition: 'width 0.3s ease'
                }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{totalSteps - currentStep + 1} tasks remaining</span>
            </div>
        </div>
    );
}
