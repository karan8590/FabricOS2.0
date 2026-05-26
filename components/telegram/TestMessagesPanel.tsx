import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, XCircle, Search, RefreshCw, Terminal, Activity } from 'lucide-react';
import styles from '@/app/telegram-center/TelegramCenter.module.css';

interface Recipient {
    id: number;
    recipient_name: string;
    telegram_username: string | null;
    role: string;
}

interface TestMessagesPanelProps {
    recipients: Recipient[];
}

export function TestMessagesPanel({ recipients }: TestMessagesPanelProps) {
    const [messageType, setMessageType] = useState('daily_summary');
    const [selectedRecipientId, setSelectedRecipientId] = useState<number | ''>('');
    const [previewContent, setPreviewContent] = useState({ english: '', gujarati: '' });
    const [isSending, setIsSending] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    
    // Command Simulation State
    const [commandInput, setCommandInput] = useState('');
    const [commandOutput, setCommandOutput] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);

    const messageTypes = [
        { id: 'daily_summary', label: 'Daily Summary' },
        { id: 'payment_reminder', label: 'Payment Reminder' },
        { id: 'production_update', label: 'Production Update' },
        { id: 'order_alert', label: 'Order Alert' },
    ];

    useEffect(() => {
        fetchPreview();
    }, [messageType]);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchPreview = async () => {
        try {
            const res = await fetch('/api/settings/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'preview', messageType })
            });
            const data = await res.json();
            if (data.preview) setPreviewContent(data.preview);
        } catch (e) {
            console.error('Failed to load preview');
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/settings/telegram/test-logs');
            const data = await res.json();
            if (data.logs) setLogs(data.logs);
        } catch (e) {
            console.error('Failed to load logs');
        }
    };

    const handleSendTest = async () => {
        if (!selectedRecipientId) {
            console.log('Please select a recipient first.');
            return;
        }
        setIsSending(true);
        try {
            const res = await fetch('/api/settings/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', messageType, recipientId: selectedRecipientId })
            });
            const data = await res.json();
            if (data.success) {
                console.log('Test message delivered successfully! ✅');
                fetchLogs(); // refresh logs
            } else {
                console.log(`Delivery failed: ${data.error} ❌`);
            }
        } catch (e) {
            console.log('Delivery failed ❌');
        } finally {
            setIsSending(false);
        }
    };

    const handleSimulateCommand = async () => {
        if (!commandInput.trim()) return;
        setIsSimulating(true);
        try {
            const res = await fetch('/api/settings/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'simulate-command', command: commandInput })
            });
            const data = await res.json();
            if (data.response) {
                setCommandOutput(data.response);
            } else {
                setCommandOutput(`Error: ${data.error}`);
            }
        } catch (e) {
            setCommandOutput('Failed to simulate command.');
        } finally {
            setIsSimulating(false);
        }
    };

    const selectedRecipientObj = recipients.find(r => r.id === Number(selectedRecipientId));
    const isGujarati = selectedRecipientObj?.role === 'Staff' || selectedRecipientObj?.role === 'Production Staff';
    const activePreview = isGujarati ? previewContent.gujarati : previewContent.english;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Message Type Selector & 2. Recipient Selector */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Test Configuration</h2>
                        <p>Select what to send and who should receive it.</p>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Message Template
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {messageTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setMessageType(type.id)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        border: messageType === type.id ? 'none' : '1px solid var(--border-primary)',
                                        background: messageType === type.id ? 'var(--accent)' : 'var(--bg-secondary)',
                                        color: messageType === type.id ? '#FFF' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Target Recipient
                        </label>
                        <select 
                            value={selectedRecipientId}
                            onChange={(e) => setSelectedRecipientId(Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        >
                            <option value="">-- Select Recipient --</option>
                            {recipients.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.recipient_name} ({r.role}) - @{r.telegram_username}
                                </option>
                            ))}
                        </select>
                        {!recipients.length && (
                            <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <XCircle size={12} /> No recipients configured. Please add one in the Recipients tab.
                            </p>
                        )}
                    </div>
                </div>

                {/* 5. Delivery Result Logs */}
                <div className={styles.card}>
                    <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2>Recent Test Logs</h2>
                            <p>History of simulated messages.</p>
                        </div>
                        <button onClick={fetchLogs} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 8px' }}>Time</th>
                                    <th style={{ padding: '12px 8px' }}>Type</th>
                                    <th style={{ padding: '12px 8px' }}>Recipient</th>
                                    <th style={{ padding: '12px 8px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            No test messages sent yet.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: '12px 8px' }}>
                                                {new Date(log.sent_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                {messageTypes.find(t => t.id === log.message_type)?.label || log.message_type}
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>{log.recipient_name}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                {log.status === 'delivered' ? (
                                                    <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle2 size={14} /> Delivered
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }} title={log.error}>
                                                        <XCircle size={14} /> Failed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Command Testing Section */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Command Simulator</h2>
                        <p>Test how the bot responds to commands without opening Telegram.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Terminal size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-tertiary)' }} />
                            <input 
                                type="text" 
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                placeholder="e.g. /summary or /order ORD-123"
                                onKeyDown={(e) => e.key === 'Enter' && handleSimulateCommand()}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px 10px 36px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    outline: 'none',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                        <button 
                            className="action-btn-secondary" 
                            onClick={handleSimulateCommand}
                            disabled={isSimulating || !commandInput.trim()}
                        >
                            {isSimulating ? '...' : 'Execute'}
                        </button>
                    </div>

                    {commandOutput && (
                        <div style={{ 
                            background: '#1A1B1E', 
                            color: '#E4E5E7', 
                            padding: '16px', 
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {commandOutput}
                        </div>
                    )}
                </div>

            </div>

            {/* Right Column: Mobile Phone Preview */}
            <div style={{ position: 'sticky', top: '24px' }}>
                <div style={{ 
                    background: '#E8F5E9', 
                    borderRadius: '24px', 
                    padding: '16px', 
                    border: '8px solid #333',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    minHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#166534' }}>FabricOS Bot</div>
                        <div style={{ fontSize: '12px', color: '#166534', opacity: 0.7 }}>bot</div>
                    </div>

                    <div style={{ 
                        flex: 1, 
                        background: '#FFF', 
                        borderRadius: '16px', 
                        padding: '12px',
                        fontSize: '13px',
                        color: '#000',
                        whiteSpace: 'pre-wrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        lineHeight: 1.5,
                        alignSelf: 'flex-start',
                        maxWidth: '90%',
                        borderBottomLeftRadius: '4px'
                    }}>
                        <div style={{ fontWeight: 600, color: '#007AFF', marginBottom: '4px' }}>FabricOS Bot</div>
                        🔧 <b>TEST MESSAGE</b>{"\n\n"}
                        {activePreview || 'Loading preview...'}
                        <div style={{ textAlign: 'right', fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <button 
                            className="action-btn-primary" 
                            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
                            onClick={handleSendTest}
                            disabled={isSending || !selectedRecipientId}
                        >
                            {isSending ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                            {isSending ? 'Sending...' : 'Send Test Message'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
