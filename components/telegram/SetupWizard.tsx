import React, { useState } from 'react';
import { Bot, Link as LinkIcon, Users, Bell, Command, CheckCircle2, Send, Rocket, AlertTriangle, PlayCircle } from 'lucide-react';
import styles from '@/app/telegram-center/TelegramCenter.module.css';

interface SetupWizardProps {
    currentStep: number;
    botToken: string;
    setBotToken: (val: string) => void;
    onValidateBot: () => void;
    validatingBot: boolean;
    botValid: boolean;
    
    onConnectWebhook: () => void;
    connectingWebhook: boolean;
    webhookActive: boolean;
    
    onAddRecipientClick: () => void;
    recipientsCount: number;
    
    onToggleNotification: (type: string, enabled: boolean) => void;
    notificationPrefs: Record<string, boolean>;
    
    commands: string[];
    onToggleCommand: (cmd: string, enabled: boolean) => void;
    
    onSendTest: () => void;
    testSent: boolean;
    
    onActivate: () => void;
    activating: boolean;
}

export function SetupWizard(props: SetupWizardProps) {
    const renderStepContent = () => {
        switch (props.currentStep) {
            case 1:
                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EEF2FF', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Connect Telegram Bot</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Enter your Telegram Bot Token from BotFather to link your account.</p>
                            </div>
                        </div>

                        <div className={styles.formField} style={{ marginBottom: '20px' }}>
                            <label>Bot Token</label>
                            <input 
                                type="text" 
                                value={props.botToken}
                                onChange={(e) => props.setBotToken(e.target.value)}
                                placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                                className={styles.formInput}
                            />
                        </div>

                        {props.botValid && (
                            <div className={styles.alertSuccess} style={{ marginBottom: '20px' }}>
                                <CheckCircle2 size={16} /> Successfully connected to Telegram Bot
                            </div>
                        )}

                        <button 
                            className="action-btn-primary"
                            onClick={props.onValidateBot}
                            disabled={props.validatingBot || !props.botToken}
                        >
                            {props.validatingBot ? 'Validating...' : (props.botValid ? 'Save & Continue' : 'Validate Bot')}
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FFF4E5', color: '#FF9800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LinkIcon size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Register Webhook</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>We will automatically configure Telegram to send real-time events to FabricOS.</p>
                            </div>
                        </div>

                        {props.webhookActive && (
                            <div className={styles.alertSuccess} style={{ marginBottom: '20px' }}>
                                <CheckCircle2 size={16} /> Webhook is active and receiving events
                            </div>
                        )}

                        <button 
                            className="action-btn-primary"
                            onClick={props.onConnectWebhook}
                            disabled={props.connectingWebhook}
                        >
                            {props.connectingWebhook ? 'Connecting...' : (props.webhookActive ? 'Continue' : 'Connect Webhook')}
                        </button>
                    </div>
                );
            case 3:
                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#E8F5E9', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add Recipients</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Add staff members or admins who should receive notifications.</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-grouped)', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{props.recipientsCount} recipient(s) added</p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="action-btn-secondary" onClick={props.onAddRecipientClick}>
                                Add Recipient
                            </button>
                            <button className="action-btn-primary" onClick={props.onValidateBot} disabled={props.recipientsCount === 0}>
                                Continue
                            </button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FCE4EC', color: '#E91E63', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Select Notifications</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Choose what types of alerts the system should broadcast.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            {Object.keys(props.notificationPrefs).map(key => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border-primary)', borderRadius: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={props.notificationPrefs[key]} 
                                        onChange={(e) => props.onToggleNotification(key, e.target.checked)} 
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</span>
                                </label>
                            ))}
                        </div>
                        <button className="action-btn-primary" onClick={props.onValidateBot}>Save & Continue</button>
                    </div>
                );
            case 5:
                const availableCommands = [
                    { id: 'summary', desc: 'Instantly fetch order details' },
                    { id: 'order', desc: 'Check order status' },
                    { id: 'payment', desc: 'Log or view payments' },
                    { id: 'dispatch', desc: 'Dispatch tracking' },
                    { id: 'pending', desc: 'Pending items list' },
                    { id: 'help', desc: 'Help menu' }
                ];

                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#E0F7FA', color: '#00BCD4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Command size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Enable Two-Way Commands</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Allow users to interact with FabricOS directly via Telegram.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {availableCommands.map(cmd => (
                                <div key={cmd.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-primary)', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>/{cmd.id}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cmd.desc}</div>
                                    </div>
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={props.commands.includes(cmd.id)} 
                                            onChange={(e) => props.onToggleCommand(cmd.id, e.target.checked)} 
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                        <button className="action-btn-primary" onClick={props.onValidateBot}>Save Commands</button>
                    </div>
                );
            case 6:
                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F3E5F5', color: '#9C27B0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <PlayCircle size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Test Automation</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Send a test message to verify the connection is working flawlessly.</p>
                            </div>
                        </div>

                        <div style={{ background: '#F0F4F8', borderRadius: '12px', padding: '16px', marginBottom: '24px', position: 'relative' }}>
                            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '80%' }}>
                                <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                    🤖 <b>FabricOS Alert</b><br/>
                                    Hello! This is a test message to confirm your Telegram Automation is set up correctly.<br/><br/>
                                    If you are seeing this, you are ready to go! 🎉
                                </p>
                            </div>
                        </div>

                        {props.testSent && (
                            <div className={styles.alertSuccess} style={{ marginBottom: '20px' }}>
                                <CheckCircle2 size={16} /> Test message dispatched successfully!
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="action-btn-secondary" onClick={props.onSendTest}>
                                <Send size={16} style={{ marginRight: '6px' }} /> Send Test Message
                            </button>
                            <button className="action-btn-primary" onClick={props.onValidateBot} disabled={!props.testSent}>
                                Continue
                            </button>
                        </div>
                    </div>
                );
            case 7:
                return (
                    <div className={styles.card} style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E8F5E9', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                            <Rocket size={40} />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0' }}>Ready for Liftoff</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '0 auto 32px auto', maxWidth: '400px', lineHeight: '1.5' }}>
                            Your Telegram Automation is fully configured. Background jobs will be enabled and notifications will start flowing instantly.
                        </p>
                        <button 
                            className="action-btn-primary" 
                            style={{ padding: '12px 32px', fontSize: '16px', height: 'auto' }}
                            onClick={props.onActivate}
                            disabled={props.activating}
                        >
                            {props.activating ? 'Activating...' : 'Activate Telegram Automation'}
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            {renderStepContent()}
        </div>
    );
}
