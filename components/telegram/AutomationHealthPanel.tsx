import React from 'react';
import { Activity, Shield, Link2, CheckCircle2, AlertTriangle, MessageSquare, Clock } from 'lucide-react';
import styles from '@/app/telegram-center/TelegramCenter.module.css';

interface AutomationHealthPanelProps {
    botValid: boolean;
    webhookActive: boolean;
    cronRunning: boolean;
    commandsEnabled: boolean;
    recipientsLinked: boolean;
    lastMessageSent: string | null;
    failedJobsCount: number;
    onFixIssue: (issue: string) => void;
}

export function AutomationHealthPanel({
    botValid,
    webhookActive,
    cronRunning,
    commandsEnabled,
    recipientsLinked,
    lastMessageSent,
    failedJobsCount,
    onFixIssue
}: AutomationHealthPanelProps) {
    
    const StatusRow = ({ label, active, icon: Icon, issueCode }: any) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: active ? '#E8F5E9' : '#FFEBEE', color: active ? '#2E7D32' : '#C62828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {active ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#2E7D32' }}>
                        <CheckCircle2 size={14} /> Active
                    </span>
                ) : (
                    <button onClick={() => onFixIssue(issueCode)} style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Fix Now
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className={styles.dashboardGrid} style={{ marginTop: '24px' }}>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2>Automation Health</h2>
                    <p>System status and connectivity overview</p>
                </div>
                
                <div>
                    <StatusRow label="Bot Connection" active={botValid} icon={Shield} issueCode="bot" />
                    <StatusRow label="Webhook Active" active={webhookActive} icon={Link2} issueCode="webhook" />
                    <StatusRow label="Recipients Linked" active={recipientsLinked} icon={MessageSquare} issueCode="recipients" />
                    <StatusRow label="Commands Enabled" active={commandsEnabled} icon={Activity} issueCode="commands" />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className={styles.card} style={{ background: failedJobsCount > 0 ? '#FFEBEE' : '#E8F5E9', borderColor: failedJobsCount > 0 ? '#FFCDD2' : '#C8E6C9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        {failedJobsCount > 0 ? <AlertTriangle color="#C62828" /> : <CheckCircle2 color="#2E7D32" />}
                        <h3 style={{ margin: 0, fontSize: '16px', color: failedJobsCount > 0 ? '#C62828' : '#2E7D32' }}>Job Status</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: failedJobsCount > 0 ? '#C62828' : '#2E7D32' }}>
                        {failedJobsCount > 0 ? `${failedJobsCount} failed background jobs detected.` : 'All background jobs running smoothly.'}
                    </p>
                </div>

                <div className={styles.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Clock color="var(--accent)" />
                        <h3 style={{ margin: 0, fontSize: '16px' }}>Last Message Sent</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {lastMessageSent ? lastMessageSent : 'No messages sent yet.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
