'use client';

import { useState, useEffect } from 'react';
import { Shield, Send, Check, X, BellOff, RefreshCw, Search, Plus, Eye, Database, AlertCircle, Sparkles, Trash2, Activity, FileText, Bell, Save } from 'lucide-react';
import styles from './TelegramCenter.module.css';
import { SetupProgressHeader } from '@/components/telegram/SetupProgressHeader';
import { SetupWizard } from '@/components/telegram/SetupWizard';
import { TelegramDashboard } from '@/components/telegram/TelegramDashboard';
import { buildDailySummaryTemplate, ReceivableItem, PayableItem } from '@/lib/telegram-templates';

interface Recipient {
    id: number;
    recipient_name: string;
    telegram_chat_id: string;
    telegram_username: string | null;
    role: string;
    notifications_enabled: number;
    is_active: number;
    last_notification_sent_at: number | null;
    daily_payments: number;
    attendance_reminder: number;
    weekly_summary: number;
    monthly_summary: number;
    instant_order_alerts: number;
    vendor_alerts: number;
    salary_alerts: number;
    expense_alerts: number;
    preferred_language?: string;
}

interface MetricStats {
    activeRecipients: number;
    dispatchesToday: number;
    automationStatus: 'Healthy' | 'Warning' | 'Error';
    failedToday: number;
}

export default function TelegramCenterPage() {
    // Data States
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<MetricStats>({
        activeRecipients: 0,
        dispatchesToday: 0,
        automationStatus: 'Healthy',
        failedToday: 0
    });

    // Global Settings
    const [botToken, setBotToken] = useState('');
    const [envBotToken, setEnvBotToken] = useState('');
    const [savingToken, setSavingToken] = useState(false);
    const [tokenSuccess, setTokenSuccess] = useState('');
    const [tokenError, setTokenError] = useState('');

    // Search and Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modals & Panels
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

    // Edit Modal States
    const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
    const [editName, setEditName] = useState('');
    const [editChatId, setEditChatId] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editRole, setEditRole] = useState('Staff');
    const [editEnabled, setEditEnabled] = useState(1);
    const [editPrefs, setEditPrefs] = useState({
        daily_payments: 1,
        attendance_reminder: 1,
        weekly_summary: 1,
        monthly_summary: 1,
        instant_order_alerts: 1,
        vendor_alerts: 1,
        salary_alerts: 1,
        expense_alerts: 1
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editLangOverride, setEditLangOverride] = useState(true);
    const [editPreferredLang, setEditPreferredLang] = useState<'english' | 'gujarati'>('english');

    // Deletion states
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Add Recipient Form States
    const [newName, setNewName] = useState('');
    const [newChatId, setNewChatId] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newRole, setNewRole] = useState('Staff');
    const [newPrefs, setNewPrefs] = useState({
        daily_payments: 1,
        attendance_reminder: 1,
        weekly_summary: 1,
        monthly_summary: 1,
        instant_order_alerts: 1,
        vendor_alerts: 1,
        salary_alerts: 1,
        expense_alerts: 1
    });
    const [adding, setAdding] = useState(false);
    const [newLangOverride, setNewLangOverride] = useState(true);
    const [newPreferredLang, setNewPreferredLang] = useState<'english' | 'gujarati'>('english');

    // Drawer Logs & History Panel
    const [logs, setLogs] = useState<any[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'delivered' | 'failed'>('all');
    const [loadingLogs, setLoadingLogs] = useState(false);


    // Wizard States
    const [wizardStep, setWizardStep] = useState(1);
    const [isActivated, setIsActivated] = useState(false);
    const [enabledCommands, setEnabledCommands] = useState<string[]>(['summary', 'order', 'payment', 'dispatch']);
    const [botValid, setBotValid] = useState(false);
    const [webhookActive, setWebhookActive] = useState(false);
    const [testSent, setTestSent] = useState(false);
    const [activating, setActivating] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // Fetch wizard state wrapper
    const loadWizardState = async () => {
        try {
            const res = await fetch('/api/settings/telegram/wizard-state');
            const data = await res.json();
            if (data.success && data.state) {
                setWizardStep(data.state.step || 1);
                setBotValid(data.state.botTokenValid || false);
                setWebhookActive(data.state.webhookRegistered || false);
                setTestSent(data.state.testSent || false);
                setIsActivated(data.state.isActivated || false);
            }
            
            const cmdRes = await fetch('/api/settings/telegram/commands');
            const cmdData = await cmdRes.json();
            if (cmdData.success && cmdData.commands) {
                setEnabledCommands(cmdData.commands);
            }
        } catch(e) {}
    };

    const saveWizardState = async (updates: any) => {
        try {
            const newState = {
                step: wizardStep,
                botTokenValid: botValid,
                webhookRegistered: webhookActive,
                recipientsAdded: recipients.length > 0,
                commandsEnabled: true,
                testSent: testSent,
                isActivated: isActivated,
                ...updates
            };
            await fetch('/api/settings/telegram/wizard-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: newState })
            });
        } catch(e) {}
    };

    const handleValidateBot = async () => {
        setSavingToken(true);
        try {
            const res = await fetch('/api/settings/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: botToken })
            });
            const data = await res.json();
            if (data.success) {
                setBotValid(true);
                showToast('success', 'Bot Validated');
                if (wizardStep === 1) {
                    setWizardStep(2);
                    saveWizardState({ step: 2, botTokenValid: true });
                } else if (wizardStep === 3) {
                    setWizardStep(4);
                    saveWizardState({ step: 4 });
                } else if (wizardStep === 4) {
                    setWizardStep(5);
                    saveWizardState({ step: 5 });
                } else if (wizardStep === 5) {
                    // Save commands
                    await fetch('/api/settings/telegram/commands', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ commands: enabledCommands })
                    });
                    setWizardStep(6);
                    saveWizardState({ step: 6 });
                } else if (wizardStep === 6) {
                    setWizardStep(7);
                    saveWizardState({ step: 7 });
                }
            } else {
                showToast('error', data.error || 'Invalid token');
            }
        } catch(e) {
            showToast('error', 'Network error');
        }
        setSavingToken(false);
    };

    const handleConnectWebhook = async () => {
        setRegisteringWebhook(true);
        try {
            const url = `${window.location.origin}/api/telegram-webhook`;
            const res = await fetch(`/api/telegram-webhook/register?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.success) {
                setWebhookActive(true);
                setWizardStep(3);
                saveWizardState({ step: 3, webhookRegistered: true });
                showToast('success', 'Webhook Connected');
            } else {
                showToast('error', data.error || data.description);
            }
        } catch(e) {
            showToast('error', 'Network error');
        }
        setRegisteringWebhook(false);
    };

    const handleActivate = async () => {
        setActivating(true);
        await saveWizardState({ isActivated: true });
        setIsActivated(true);
        setActivating(false);
        showToast('success', 'Telegram Automation Activated!');
    };
    
    // Refresh Trigger
    const [refreshing, setRefreshing] = useState(false);

    // Webhook State
    const [webhookUrl, setWebhookUrl] = useState('');
    const [registeringWebhook, setRegisteringWebhook] = useState(false);

    // Language Defaults
    const [roleDefaults, setRoleDefaults] = useState<Record<string, string>>({
        Admin: 'english',
        Manager: 'english',
        Staff: 'gujarati',
        Accountant: 'english',
        'Production Staff': 'gujarati'
    });

    // Dispatch Testing Suite States
    const [selectedTestTargets, setSelectedTestTargets] = useState<number[]>([]);
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);
    const [advancedTestingExpanded, setAdvancedTestingExpanded] = useState(false);
    
    // Simulation Settings
    const [simFail, setSimFail] = useState(false);
    const [simOverdue, setSimOverdue] = useState(false);
    const [simEmpty, setSimEmpty] = useState(false);
    const [simLargeAmount, setSimLargeAmount] = useState(false);
    const [simPartial, setSimPartial] = useState(false);

    // Testing Active Actions
    const [previewingType, setPreviewingType] = useState<string | null>(null);
    const [sendingType, setSendingType] = useState<string | null>(null);
    
    // Session Test Dispatch Logs (timeline)
    const [testLogs, setTestLogs] = useState<{
        id: number;
        type: string;
        recipientName: string;
        status: 'delivered' | 'failed';
        time: string;
        error?: string;
    }[]>([
        { id: 1, type: 'monthly_summary', recipientName: 'Admin', status: 'delivered', time: '05:11 PM' },
        { id: 2, type: 'daily_payments', recipientName: 'Accountant', status: 'delivered', time: '09:01 AM' },
        { id: 3, type: 'attendance', recipientName: 'All Recipients', status: 'failed', time: '08:45 AM', error: 'Telegram blocked recipient (Simulated)' }
    ]);

    // Toast Notifications State
    const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error'; message: string }[]>([]);

    const showToast = (type: 'success' | 'error', message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const getTelegramPreviewContent = (type: string) => {
        switch (type) {
            case 'daily_payments': {
                const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                let mockReceivables: ReceivableItem[] = [];
                let mockPayables: PayableItem[] = [];
                let totalReceivable = 0;
                let totalPayable = 0;

                if (simEmpty) {
                    // Empty state
                } else if (simOverdue) {
                    mockReceivables = [
                        { customerName: 'Karan Textiles', orderNumber: 'ORD-2026-0042', pendingAmount: 34600 },
                        { customerName: 'Aditya Hub', orderNumber: 'ORD-2026-0051', pendingAmount: 15300 }
                    ];
                    mockPayables = [
                        { vendorName: 'Vishal Dye Works', pendingAmount: 18000 }
                    ];
                    totalReceivable = 49900;
                    totalPayable = 18000;
                } else {
                    mockReceivables = [
                        { customerName: 'Rajesh Textiles', orderNumber: 'ORD-2026-0042', pendingAmount: 48000 },
                        { customerName: 'Priya Fabrics', orderNumber: 'ORD-2026-0051', pendingAmount: 32500 }
                    ];
                    mockPayables = [
                        { vendorName: 'Vishal Dye Works', pendingAmount: 18000 },
                        { vendorName: 'Raj Embroidery', pendingAmount: 12500 }
                    ];
                    totalReceivable = 80500;
                    totalPayable = 30500;
                }

                const payload = buildDailySummaryTemplate({
                    dateStr,
                    receivables: mockReceivables,
                    payables: mockPayables,
                    totalReceivable,
                    totalPayable
                });
                
                return payload.english; // Can default to english for the text preview area
            }
            
            case 'weekly_summary':
                if (simEmpty) {
                    return '📊 *FabricOS — Weekly Summary*\n\nOrders: 0\nRevenue: ₹0\nExpenses: ₹0\n*Net Cash*: ₹0';
                }
                if (simLargeAmount) {
                    return '📊 *FabricOS — Weekly Summary*\n\nOrders: 42\nRevenue: ₹12,45,000\nExpenses: ₹2,10,000\n*Net Cash*: ₹10,35,000';
                }
                return '📊 *FabricOS — Weekly Summary*\n\nOrders: 7\nRevenue: ₹1,12,000\nExpenses: ₹28,500\n*Net Cash*: ₹83,500';
            
            case 'monthly_summary':
                if (simEmpty) {
                    return '📄 *FabricOS — Monthly Summary Report*\n\nNo operations recorded in the last month.';
                }
                return '📄 *FabricOS — Monthly Summary Report*\n\nMay 2026 Financial metrics:\n• Total Revenue: ₹4,80,000\n• Total Expenses: ₹1,20,000\n• Active Orders: 28\n• Production Yield: 94%';
            
            case 'attendance':
                if (simEmpty) {
                    return '⏰ *FabricOS — Attendance Reminder*\n\nAll employee timesheets submitted. No pending logs.';
                }
                return '⏰ *FabricOS — Attendance Reminder*\n\n*Attention*: The following employees have not marked attendance today:\n• Rohan Gupta\n• Meera Sen\n\nPlease ensure timesheets are logged before 06:00 PM.';
            
            case 'new_order':
                if (simLargeAmount) {
                    return '📥 *FabricOS — New Order Alert*\n\nOrder #ORD-2026-901 has been booked.\n*Customer*: VIP Client Corp\n*Items*: Silk Paisley (500m)\n*Total Value*: ₹2,25,000';
                }
                return '📥 *FabricOS — New Order Alert*\n\nOrder #ORD-2026-889 has been booked.\n*Customer*: Priya Sharma\n*Items*: Linen Stripes (40m)\n*Total Value*: ₹10,000';
            
            case 'payment_received':
                if (simPartial) {
                    return '💸 *FabricOS — Payment Received*\n\n*Partial payment* logged for Rajesh Kumar.\nInvoice Amount: ₹15,000\n*Received*: ₹7,500\nRemaining: ₹7,500\n*Method*: UPI';
                }
                return '💸 *FabricOS — Payment Received*\n\n*Full payment* logged for Rajesh Kumar.\nAmount: ₹15,000\n*Method*: UPI\n*Reference*: Ref-9928371';
            
            case 'order_dispatched':
                return '🚚 *FabricOS — Order Dispatched*\n\nOrder #ORD-2026-889 has been dispatched for delivery.\n*Customer*: Priya Sharma\n*Design*: Linen Stripes (40m)\n*Courier Partner*: Blue Dart\n*Tracking ID*: BD-8837190';
            
            case 'vendor_payment':
                return '⚠️ *FabricOS — Vendor Payment Alert*\n\nUpcoming payment due to Textile Suppliers Ltd in 2 days.\n*Amount*: ₹50,000\n*Due Date*: 2026-05-21\n*Current Balance*: ₹75,000';
            
            case 'salary_paid':
                return '💵 *FabricOS — Salary Disbursed*\n\nSalary for May 2026 has been processed.\n*Employee*: Staff User\nBasic Pay: ₹20,000\nOvertime: ₹2,500\nDeductions: ₹0\n*Net Paid*: ₹22,500\n*Reference*: Sal-998877';
            
            case 'expense_added':
                return '📝 *FabricOS — Expense Logged*\n\nNew expense recorded.\n*Category*: Raw Material\n*Amount*: ₹25,000\n*Logged by*: Admin User\n*Notes*: Cotton purchase\n*Linked ID*: EXP-77291';
                
            default:
                return '🔔 *FabricOS Test Alert*\n\nThis is a test notification.';
        }
    };

    const handleSendTestDispatch = async (type: string) => {
        if (selectedTestTargets.length === 0) {
            showToast('error', 'Please select at least one recipient to receive the test.');
            return;
        }

        setSendingType(type);

        // Map type code to labels
        const typeLabels: Record<string, string> = {
            daily_payments: 'Daily Payment Reminder',
            weekly_summary: 'Weekly Summary',
            monthly_summary: 'Monthly Financial PDF',
            attendance: 'Attendance Reminder',
            new_order: 'New Order Alert',
            payment_received: 'Payment Received Alert',
            order_dispatched: 'Order Dispatched Alert',
            vendor_payment: 'Vendor Payment Alert',
            salary_paid: 'Salary Paid Alert',
            expense_added: 'Expense Added Alert'
        };

        const typeLabel = typeLabels[type] || type;
        let successCount = 0;
        let failCount = 0;
        let lastError = '';

        // Simulating delay for premium animation feedback
        await new Promise(resolve => setTimeout(resolve, 800));

        for (const targetId of selectedTestTargets) {
            const recipient = recipients.find(r => r.id === targetId);
            const recipientName = recipient ? recipient.recipient_name : `Recipient #${targetId}`;

            try {
                const res = await fetch(`/api/settings/telegram/recipients/${targetId}/test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        simulateFail: simFail,
                        simulateOverdue: simOverdue,
                        simulateEmpty: simEmpty,
                        simulateLargeAmount: simLargeAmount,
                        simulatePartial: simPartial
                    })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    successCount++;
                    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    setTestLogs(prev => [
                        {
                            id: Date.now() + Math.random(),
                            type,
                            recipientName,
                            status: 'delivered',
                            time: nowStr
                        },
                        ...prev
                    ]);
                } else {
                    failCount++;
                    lastError = data.error || 'Failed to dispatch';
                    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    setTestLogs(prev => [
                        {
                            id: Date.now() + Math.random(),
                            type,
                            recipientName,
                            status: 'failed',
                            time: nowStr,
                            error: lastError
                        },
                        ...prev
                    ]);
                }
            } catch (err: any) {
                failCount++;
                lastError = err.message || 'Network error';
                const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                setTestLogs(prev => [
                    {
                        id: Date.now() + Math.random(),
                        type,
                        recipientName,
                        status: 'failed',
                        time: nowStr,
                        error: lastError
                    },
                    ...prev
                ]);
            }
        }

        setSendingType(null);
        fetchStatsSummary();

        if (failCount === 0 || successCount > 0) {
            setTestSent(true);
            saveWizardState({ testSent: true });
        }
        if (failCount === 0) {
            const firstRecipientName = recipients.find(r => r.id === selectedTestTargets[0])?.recipient_name || 'Recipient';
            const extra = selectedTestTargets.length > 1 ? ` & ${selectedTestTargets.length - 1} others` : '';
            showToast('success', `Test message delivered to ${firstRecipientName}${extra} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
        } else if (successCount > 0) {
            showToast('success', `Delivered to ${successCount} recipients, failed for ${failCount}.`);
        } else {
            showToast('error', `Test dispatch failed: ${lastError}`);
        }
    };

    useEffect(() => {
        if (recipients.length > 0 && selectedTestTargets.length === 0) {
            setSelectedTestTargets(recipients.filter(r => r.notifications_enabled === 1).map(r => r.id));
        }
    }, [recipients]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWebhookUrl(`${window.location.origin}/api/telegram-webhook`);
        }
        loadData();
    }, []);

    useEffect(() => {
        if (selectedRecipient) {
            loadRecipientLogs(selectedRecipient.id);
        }
    }, [selectedRecipient]);

    const loadData = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchRecipients(),
                fetchGlobalSettings(),
                fetchStatsSummary(),
                fetchRoleDefaults(),
                loadWizardState()
            ]);
        } catch (err) {
            console.error('Error loading center data:', err);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    const fetchRecipients = async () => {
        const res = await fetch('/api/settings/telegram/recipients');
        if (res.ok) {
            const data = await res.json();
            setRecipients(data.recipients || []);
        }
    };

    const fetchRoleDefaults = async () => {
        try {
            const res = await fetch('/api/settings/telegram');
            if (res.ok) {
                const data = await res.json();
                if (data.roleDefaults) {
                    setRoleDefaults(data.roleDefaults);
                }
            }
        } catch (err) {
            console.error('Failed to fetch role defaults:', err);
        }
    };

    const handleUpdateRoleDefault = async (roleName: string, langValue: string) => {
        const updated = { ...roleDefaults, [roleName]: langValue };
        setRoleDefaults(updated);
        try {
            const res = await fetch('/api/settings/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleDefaults: updated })
            });
            if (res.ok) {
                showToast('success', `Default language for ${roleName} set to ${langValue.charAt(0).toUpperCase() + langValue.slice(1)}`);
            } else {
                showToast('error', 'Failed to update role default language');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save settings');
        }
    };

    const fetchGlobalSettings = async () => {
        const res = await fetch('/api/settings/whatsapp');
        if (res.ok) {
            const data = await res.json();
            setBotToken(data.telegram_bot_token || '');
            setEnvBotToken(data.env_telegram_bot_token || '');
        }
    };

    const fetchStatsSummary = async () => {
        try {
            const res = await fetch('/api/settings/telegram/recipients');
            if (res.ok) {
                const data = await res.json();
                const list: Recipient[] = data.recipients || [];
                const active = list.filter(r => r.is_active === 1 && r.notifications_enabled === 1).length;
                
                let totalToday = 0;
                let failsToday = 0;
                
                for (const r of list) {
                    const logRes = await fetch(`/api/settings/telegram/recipients/${r.id}/logs`);
                    if (logRes.ok) {
                        const logData = await logRes.json();
                        const rLogs: any[] = logData.logs || [];
                        const todayMs = new Date().setHours(0,0,0,0) / 1000;
                        const todayLogs = rLogs.filter(l => l.sent_at >= todayMs);
                        totalToday += todayLogs.length;
                        failsToday += todayLogs.filter(l => l.delivery_status === 'failed').length;
                    }
                }

                setStats({
                    activeRecipients: active,
                    dispatchesToday: totalToday,
                    automationStatus: failsToday > 0 ? 'Warning' : (active === 0 ? 'Warning' : 'Healthy'),
                    failedToday: failsToday
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadRecipientLogs = async (id: number) => {
        setLoadingLogs(true);
        try {
            const res = await fetch(`/api/settings/telegram/recipients/${id}/logs`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleSaveBotToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingToken(true);
        setTokenSuccess('');
        setTokenError('');

        try {
            const res = await fetch('/api/settings/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_bot_token: botToken.trim()
                })
            });

            if (res.ok) {
                setTokenSuccess('Bot token updated successfully.');
                setTimeout(() => setTokenSuccess(''), 3000);
                fetchStatsSummary();
            } else {
                const data = await res.json();
                setTokenError(data.error || 'Failed to save token.');
            }
        } catch (err) {
            setTokenError('Network error occurred.');
        } finally {
            setSavingToken(false);
        }
    };

    const handleRegisterWebhook = async () => {
        setRegisteringWebhook(true);
        try {
            const res = await fetch(`/api/telegram-webhook/register?url=${encodeURIComponent(webhookUrl)}`);
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Webhook registered successfully!');
            } else {
                showToast('error', `Failed: ${data.error || data.description}`);
            }
        } catch (err) {
            showToast('error', 'Network error registering webhook.');
        } finally {
            setRegisteringWebhook(false);
        }
    };

    const handleAddRecipient = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch('/api/settings/telegram/recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_name: newName,
                    telegram_chat_id: newChatId,
                    telegram_username: newUsername,
                    role: newRole,
                    preferences: newPrefs,
                    preferred_language: newLangOverride ? 'role_default' : newPreferredLang
                })
            });
            if (res.ok) {
                await loadData();
                setShowAddModal(false);
                setNewName('');
                setNewChatId('');
                setNewUsername('');
                setNewRole('Staff');
                setNewPrefs({
                    daily_payments: 1,
                    attendance_reminder: 1,
                    weekly_summary: 1,
                    monthly_summary: 1,
                    instant_order_alerts: 1,
                    vendor_alerts: 1,
                    salary_alerts: 1,
                    expense_alerts: 1
                });
                setNewLangOverride(true);
                setNewPreferredLang('english');
            } else {
                alert('Failed to register recipient.');
            }
        } catch (err) {
            alert('Error registering recipient.');
        } finally {
            setAdding(false);
        }
    };

    const updatePreference = async (id: number, prefKey: string, value: number) => {
        setRecipients(prev => prev.map(r => r.id === id ? { ...r, [prefKey]: value } : r));
        if (selectedRecipient && selectedRecipient.id === id) {
            setSelectedRecipient(prev => prev ? { ...prev, [prefKey]: value } : null);
        }

        try {
            await fetch(`/api/settings/telegram/recipients/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferences: {
                        [prefKey]: value
                    }
                })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const toggleGlobalNotification = async (id: number, enabled: number) => {
        setRecipients(prev => prev.map(r => r.id === id ? { ...r, notifications_enabled: enabled } : r));
        if (selectedRecipient && selectedRecipient.id === id) {
            setSelectedRecipient(prev => prev ? { ...prev, notifications_enabled: enabled } : null);
        }

        try {
            await fetch(`/api/settings/telegram/recipients/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notifications_enabled: enabled })
            });
            fetchStatsSummary();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (editingRecipient) {
            setEditName(editingRecipient.recipient_name);
            setEditChatId(editingRecipient.telegram_chat_id);
            setEditUsername(editingRecipient.telegram_username || '');
            setEditRole(editingRecipient.role || 'Staff');
            setEditEnabled(editingRecipient.notifications_enabled);
            setEditPrefs({
                daily_payments: editingRecipient.daily_payments,
                attendance_reminder: editingRecipient.attendance_reminder,
                weekly_summary: editingRecipient.weekly_summary,
                monthly_summary: editingRecipient.monthly_summary,
                instant_order_alerts: editingRecipient.instant_order_alerts,
                vendor_alerts: editingRecipient.vendor_alerts,
                salary_alerts: editingRecipient.salary_alerts || 1,
                expense_alerts: editingRecipient.expense_alerts || 1
            });
            if (editingRecipient.preferred_language === 'role_default' || !editingRecipient.preferred_language) {
                setEditLangOverride(true);
                setEditPreferredLang((roleDefaults[editingRecipient.role] || 'english') as 'english' | 'gujarati');
            } else {
                setEditLangOverride(false);
                setEditPreferredLang(editingRecipient.preferred_language as 'english' | 'gujarati');
            }
        }
    }, [editingRecipient]);

    const handleEditRecipientSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecipient) return;
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/settings/telegram/recipients/${editingRecipient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_name: editName,
                    telegram_chat_id: editChatId,
                    telegram_username: editUsername || null,
                    role: editRole,
                    notifications_enabled: editEnabled,
                    preferences: editPrefs,
                    preferred_language: editLangOverride ? 'role_default' : editPreferredLang
                })
            });
            if (res.ok) {
                showToast('success', 'Recipient details updated successfully.');
                setEditingRecipient(null);
                loadData();
            } else {
                const data = await res.json();
                showToast('error', `Failed to save changes: ${data.error || 'Server error'}`);
            }
        } catch (err: any) {
            showToast('error', `Network error: ${err.message}`);
        } finally {
            setSavingEdit(false);
        }
    };

    const deleteRecipient = async (id: number) => {
        if (deletingId !== id) {
            setDeletingId(id);
            setTimeout(() => {
                setDeletingId(prev => prev === id ? null : prev);
            }, 3000);
            return;
        }
        
        setDeletingId(null);
        try {
            const res = await fetch(`/api/settings/telegram/recipients/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('success', 'Recipient successfully removed.');
                setSelectedRecipient(null);
                loadData();
            } else {
                const data = await res.json();
                showToast('error', `Failed to delete recipient: ${data.error || 'Server error'}`);
            }
        } catch (err: any) {
            showToast('error', `Network error: ${err.message}`);
            console.error(err);
        }
    };

    const sendTestAlert = async (id: number, type: string) => {
        try {
            const res = await fetch(`/api/settings/telegram/recipients/${id}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            if (res.ok) {
                alert('Diagnostic telegram alert dispatched.');
                loadRecipientLogs(id);
                fetchStatsSummary();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Failed to trigger test.');
        }
    };

    // Filter Logic
    const filteredRecipients = recipients.filter(r => {
        const matchesSearch = r.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (r.telegram_username && r.telegram_username.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === 'All' || r.role === roleFilter;
        const matchesStatus = statusFilter === 'All' || 
                             (statusFilter === 'Active' && r.notifications_enabled === 1) ||
                             (statusFilter === 'Muted' && r.notifications_enabled === 0);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const filteredLogs = logs.filter(log => {
        if (logFilter === 'all') return true;
        return log.delivery_status === logFilter;
    });

    const formatTimestamp = (sec: number | null) => {
        if (!sec) return 'Never';
        const d = new Date(sec * 1000);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header Row */}
            {/* Header Row */}
            <div className={styles.headerRow} style={{ borderBottom: isActivated ? '1px solid var(--border-primary)' : 'none', paddingBottom: isActivated ? '20px' : '0' }}>
                <div className={styles.headerInfo}>
                    <h1>Telegram Center</h1>
                    <p>{isActivated ? 'Manage business alerts, reports, recipients, and automated dispatches.' : 'Connect your Telegram bot to enable automation'}</p>
                </div>
                
                {isActivated && (
                    <div className={styles.headerActions}>
                        <button onClick={loadData} disabled={refreshing} className="action-btn-secondary">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            <span>Refresh</span>
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="action-btn-primary">
                            <Plus size={16} />
                            <span>Add Recipient</span>
                        </button>
                    </div>
                )}
            </div>

            {!isActivated && (
                <div className={styles.progressContainer} style={{ marginBottom: '32px' }}>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${(wizardStep / 7) * 100}%` }} />
                    </div>
                    <span className={styles.progressLabel}>{wizardStep} of 7 steps completed</span>
                </div>
            )}



            {/* MAIN WIZARD OR DASHBOARD SWITCH */}
            {!isActivated ? (
                <SetupWizard 
                    currentStep={wizardStep}
                    setWizardStep={setWizardStep}
                    saveWizardState={saveWizardState}
                    botToken={botToken}
                    setBotToken={setBotToken}
                    onValidateBot={handleValidateBot}
                    validatingBot={savingToken}
                    botValid={botValid}
                    onActivate={handleActivate}
                    activating={activating}
                />
            ) : (
                <TelegramDashboard 
                    botValid={botValid}
                    botToken={botToken}
                    webhookActive={webhookActive}
                    recipients={recipients}
                    testLogs={testLogs}
                    onAddRecipient={() => setShowAddModal(true)}
                    onReconfigure={() => { setIsActivated(false); setWizardStep(1); }}
                />
            )}

            {/* Toast Notifications */}
            <div className={styles.toastContainer}>
                {toasts.map(t => (
                    <div key={t.id} className={`${styles.toast} ${t.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
                        {t.type === 'success' ? (
                            <Check size={18} className={styles.toastIconSuccess} />
                        ) : (
                            <AlertCircle size={18} className={styles.toastIconError} />
                        )}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>

        </div>
    );
}
