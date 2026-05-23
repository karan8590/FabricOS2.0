import React, { useState } from 'react';
import { Activity, Shield, Users, MessageSquare, Terminal, RefreshCw, Settings, Search, Plus, FlaskConical } from 'lucide-react';
import styles from '@/app/telegram-center/TelegramCenter.module.css';
import { TestMessagesPanel } from './TestMessagesPanel';

interface DashboardProps {
    botValid: boolean;
    botToken: string;
    webhookActive: boolean;
    recipients: any[];
    testLogs: any[];
    onAddRecipient: () => void;
    onReconfigure: () => void;
}

export function TelegramDashboard({
    botValid, botToken, webhookActive, recipients, testLogs, onAddRecipient, onReconfigure
}: DashboardProps) {
    const [activeTab, setActiveTab] = useState('overview');

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button 
            className={`${styles.tabButton} ${activeTab === id ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(id)}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={16} />
                {label}
            </div>
        </button>
    );

    return (
        <div>
            {/* Tabs Navigation */}
            <div className={styles.tabsContainer}>
                <TabButton id="overview" label="Overview" icon={Activity} />
                <TabButton id="recipients" label="Recipients" icon={Users} />
                <TabButton id="notifications" label="Notifications Config" icon={MessageSquare} />
                <TabButton id="commands" label="Bot Commands" icon={Terminal} />
                <TabButton id="test-messages" label="Test Messages" icon={FlaskConical} />
                <TabButton id="reconfigure" label="Reconfigure" icon={Settings} />
            </div>

            {/* Tab Contents */}
            <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className={styles.card} style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Shield color="#166534" />
                                <div>
                                    <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ti ti-circle-check" /> Telegram bot active — @FabricOSBot</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#166534' }}>Connected and receiving real-time events.</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.metricGrid}>
                            <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                    <span className={styles.metricLabel}>Messages Sent Today</span>
                                    <span className={styles.metricValue}>12</span>
                                </div>
                            </div>
                            <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                    <span className={styles.metricLabel}>Messages This Month</span>
                                    <span className={styles.metricValue}>345</span>
                                </div>
                            </div>
                            <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                    <span className={styles.metricLabel}>Failed Deliveries</span>
                                    <span className={styles.metricValue} style={{ color: '#EF4444' }}>0</span>
                                </div>
                            </div>
                            <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                    <span className={styles.metricLabel}>Commands Received</span>
                                    <span className={styles.metricValue}>8</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2>Recent Activity</h2>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 0' }}>Time</th>
                                        <th style={{ padding: '12px 0' }}>Type</th>
                                        <th style={{ padding: '12px 0' }}>Recipient</th>
                                        <th style={{ padding: '12px 0' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {testLogs.slice(0, 5).map((log, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: '12px 0' }}>{log.time}</td>
                                            <td style={{ padding: '12px 0' }}>{log.type}</td>
                                            <td style={{ padding: '12px 0' }}>{log.target}</td>
                                            <td style={{ padding: '12px 0', color: log.status === 'delivered' ? '#10B981' : '#EF4444' }}>{log.status}</td>
                                        </tr>
                                    ))}
                                    {testLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>No recent activity.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'recipients' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2>Recipients Directory</h2>
                                <p>Manage who receives automated business notifications.</p>
                            </div>
                            <button className="action-btn-primary" onClick={onAddRecipient}>
                                <Plus size={16} /> Add Recipient
                            </button>
                        </div>
                        
                        <div className={styles.filterBar}>
                            <div className={styles.searchContainer}>
                                <div className={styles.searchIcon}><Search size={16} /></div>
                                <input type="text" placeholder="Search recipients..." className={styles.searchInput} />
                            </div>
                        </div>

                        <div className={styles.recipientGrid}>
                            {recipients.map(r => (
                                <div key={r.id} className={styles.recipientCard}>
                                    <div className={styles.recipientTop}>
                                        <div className={styles.recipientMeta}>
                                            <div className={styles.avatar}>{r.recipient_name?.[0] || 'U'}</div>
                                            <div className={styles.recipientDetails}>
                                                <h4>{r.recipient_name}</h4>
                                                <span>@{r.telegram_username || r.telegram_chat_id}</span>
                                            </div>
                                        </div>
                                        <div className={`${styles.badge} ${styles.badgeStaff}`}>{r.role || 'Staff'}</div>
                                    </div>
                                    <div className={styles.preferencesSection}>
                                        <span className={styles.prefLabel}>Receives</span>
                                        <div className={styles.prefTags}>
                                            <span className={styles.prefTag}>Daily Summary</span>
                                            <span className={styles.prefTag}>Alerts</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {recipients.length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', gridColumn: '1 / -1' }}>
                                    No recipients configured yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2>Global Notification Settings</h2>
                            <p>Configure which alerts the system broadcasts.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input type="checkbox" defaultChecked />
                                <span style={{ fontWeight: 500 }}>Enable daily business summary at 9:00 AM IST</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input type="checkbox" defaultChecked />
                                <span style={{ fontWeight: 500 }}>Alert me when invoices are due</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input type="checkbox" defaultChecked />
                                <span style={{ fontWeight: 500 }}>Alert me when ink and packaging stock is low</span>
                            </label>
                            <button className="action-btn-primary" style={{ width: 'fit-content', marginTop: '12px' }}>Save Config</button>
                        </div>
                    </div>
                )}

                {activeTab === 'commands' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2>Bot Command Logs</h2>
                            <p>Incoming commands from Telegram users.</p>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 0' }}>Time</th>
                                    <th style={{ padding: '12px 0' }}>Command</th>
                                    <th style={{ padding: '12px 0' }}>User</th>
                                    <th style={{ padding: '12px 0' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>No commands received recently.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'test-messages' && (
                    <TestMessagesPanel recipients={recipients} />
                )}

                {activeTab === 'reconfigure' && (
                    <div className={styles.card} style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Shield size={48} color="var(--accent)" style={{ margin: '0 auto 16px auto' }} />
                        <h2>Reconfigure Telegram Automation</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                            Need to change your Bot Token or completely restart the setup process? This will reset the wizard.
                        </p>
                        <button className="action-btn-secondary" onClick={onReconfigure} style={{ margin: '0 auto' }}>
                            Restart Setup Wizard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
