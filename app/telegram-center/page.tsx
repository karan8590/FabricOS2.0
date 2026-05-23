'use client';

import { useState, useEffect } from 'react';
import { Shield, Send, Check, X, BellOff, RefreshCw, Search, Plus, Eye, Database, AlertCircle, Sparkles, Trash2, Activity, FileText, Bell, Save } from 'lucide-react';
import styles from './TelegramCenter.module.css';
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
                fetchRoleDefaults()
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
            <div className={styles.headerRow}>
                <div className={styles.headerInfo}>
                    <h1>Telegram Center</h1>
                    <p>Manage business alerts, reports, recipients, and automated dispatches.</p>
                </div>
                
                <div className={styles.headerActions}>
                    <button 
                        onClick={loadData}
                        disabled={refreshing}
                        className="action-btn-secondary"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="action-btn-primary"
                    >
                        <Plus size={16} />
                        <span>Add Recipient</span>
                    </button>
                </div>
            </div>



            {/* Main Content Dashboard Grid */}
            <div className={styles.dashboardGrid}>
                {/* Left Column: Recipients List */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Recipients Directory</h2>
                        <p>Manage who receives automated business notifications and report summaries.</p>
                    </div>

                    {/* Filter controls row */}
                    <div className={styles.filterBar}>
                        <div className={styles.searchContainer}>
                            <div className={styles.searchIcon}>
                                <Search size={16} />
                            </div>
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name or username..."
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.filterSelects}>
                            <select 
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="All">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="Staff">Staff</option>
                            </select>
                            <select 
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Muted">Muted</option>
                            </select>
                        </div>
                    </div>

                    {/* Directory grid */}
                    {loading ? (
                        <div className={styles.loading}>
                            <RefreshCw className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent)' }} size={24} />
                            <span>Loading recipients directory...</span>
                        </div>
                    ) : filteredRecipients.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div style={{ margin: '0 auto 16px auto', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-grouped)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BellOff className="text-slate-400" size={20} />
                            </div>
                            <h4>No Recipients Found</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Try modifying your filter settings or click Add Recipient to register a new team member.</p>
                        </div>
                    ) : (
                        <div className={styles.recipientGrid}>
                            {filteredRecipients.map(r => (
                                <div 
                                    key={r.id}
                                    className={styles.recipientCard}
                                    style={{ cursor: 'default' }}
                                >
                                    <div>
                                        {/* Top Info */}
                                        <div className={styles.recipientTop}>
                                            <div className={styles.recipientMeta}>
                                                <div className={styles.avatar}>
                                                    {r.recipient_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={styles.recipientDetails}>
                                                    <h4>{r.recipient_name}</h4>
                                                    {r.telegram_username ? (
                                                        <span>@{r.telegram_username}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)' }}>No username</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className={styles.badgeRow}>
                                                <span className={`${styles.badge} ${
                                                    r.role === 'Admin' ? styles.badgeAdmin :
                                                    r.role === 'Manager' ? styles.badgeManager :
                                                    styles.badgeStaff
                                                }`}>
                                                    {r.role}
                                                </span>
                                                <span className={`${styles.statusIndicator} ${r.notifications_enabled ? styles.statusActive : styles.statusMuted}`} />
                                                <span className={styles.langBadge} title={r.preferred_language === 'role_default' || !r.preferred_language ? "Inherited from Role Default" : "Custom Preference Override"}>
                                                    {r.preferred_language === 'role_default' || !r.preferred_language 
                                                        ? (roleDefaults[r.role] === 'gujarati' ? '🇮🇳 ગુજરાતી' : '🇺🇸 English') 
                                                        : (r.preferred_language === 'gujarati' ? '🇮🇳 ગુજરાતી' : '🇺🇸 English')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Preferences Tags */}
                                        <div className={styles.preferencesSection}>
                                            <span className={styles.prefLabel}>Opted-in Alerts</span>
                                            <div className={styles.prefTags}>
                                                {r.daily_payments === 1 && <span className={styles.prefTag}>Daily Balance</span>}
                                                {r.attendance_reminder === 1 && <span className={styles.prefTag}>Attendance</span>}
                                                {r.weekly_summary === 1 && <span className={styles.prefTag}>Weekly PDF</span>}
                                                {r.monthly_summary === 1 && <span className={styles.prefTag}>Monthly PDF</span>}
                                                {r.instant_order_alerts === 1 && <span className={styles.prefTag}>Orders</span>}
                                                {r.vendor_alerts === 1 && <span className={styles.prefTag}>Vendors</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className={styles.recipientFooter} style={{ borderBottom: '1px dashed var(--border-primary)', paddingBottom: '12px', marginBottom: '12px' }}>
                                            <span className={styles.footerLabel}>Last active</span>
                                            <span className={styles.footerValue}>{formatTimestamp(r.last_notification_sent_at)}</span>
                                        </div>

                                        {/* Card actions */}
                                        <div className={styles.recipientCardActions} style={{ margin: 0, padding: 0, border: 'none' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => setEditingRecipient(r)}
                                                className={styles.cardEditBtn}
                                            >
                                                Edit / Toggle Alerts
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => deleteRecipient(r.id)}
                                                className={`${styles.cardDeleteBtn} ${deletingId === r.id ? styles.cardDeleteBtnConfirm : ''}`}
                                            >
                                                {deletingId === r.id ? 'Confirm?' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: API and Diagnostics */}
                <div className={styles.sidebarColumn}>
                    {/* Two-Way Bot Configuration */}
                    <div className={styles.card} style={{ padding: '24px', marginBottom: '24px' }}>
                        <div className={styles.cardHeader} style={{ marginBottom: '20px', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Two-Way Bot Configuration</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Receive commands via Webhook</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.apiBlock} style={{ marginBottom: '16px' }}>
                            <span className={styles.apiBlockTitle}>Webhook URL</span>
                            <div style={{ marginTop: '8px', padding: '10px 12px', background: 'var(--bg-grouped)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-all', border: '1px solid var(--border-primary)' }}>
                                {webhookUrl || 'Loading...'}
                            </div>
                            <button 
                                onClick={handleRegisterWebhook} 
                                disabled={registeringWebhook || !webhookUrl}
                                className="action-btn-primary" 
                                style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                            >
                                {registeringWebhook ? 'Registering...' : 'Register Webhook'}
                            </button>
                        </div>
                    </div>

                    {/* Bot integration card */}
                    <div className={styles.card} style={{ padding: '24px' }}>
                        <div className={styles.cardHeader} style={{ marginBottom: '20px', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Database size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Automation Health</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Dispatcher status</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.healthGrid}>
                            <div className={styles.healthRow}>
                                <span className={styles.healthLabel}>Webhook Link</span>
                                <span className={`${styles.healthValue} ${styles.healthValueConnected}`}>
                                    <div className={styles.statusDot} /> Connected
                                </span>
                            </div>
                            <div className={styles.healthRow}>
                                <span className={styles.healthLabel}>Cron Dispatcher</span>
                                <span className={styles.healthValue}>Active (09:00 AM IST)</span>
                            </div>
                            <div className={styles.healthRow}>
                                <span className={styles.healthLabel}>Bot Token</span>
                                <span className={botToken || envBotToken ? styles.badgeConfigured : styles.badgeMissing}>
                                    {botToken || envBotToken ? 'Configured' : 'Missing'}
                                </span>
                            </div>
                        </div>

                        {/* Role Language Defaults Panel */}
                        <div className={styles.apiBlock} style={{ marginBottom: '16px' }}>
                            <span className={styles.apiBlockTitle}>Role Language Defaults</span>
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
                                {['Admin', 'Manager', 'Accountant', 'Production Staff', 'Staff'].map(role => (
                                    <div key={role} className={styles.roleLangRow}>
                                        <span className={styles.roleNameLabel}>{role}</span>
                                        <div className={styles.roleSelectBtnGroup}>
                                            <button 
                                                className={`${styles.roleSelectBtn} ${roleDefaults[role] === 'english' ? styles.roleSelectBtnActive : ''}`}
                                                onClick={() => handleUpdateRoleDefault(role, 'english')}
                                            >
                                                EN
                                            </button>
                                            <button 
                                                className={`${styles.roleSelectBtn} ${roleDefaults[role] === 'gujarati' ? styles.roleSelectBtnActive : ''}`}
                                                onClick={() => handleUpdateRoleDefault(role, 'gujarati')}
                                            >
                                                GUJ
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save bot token inline form */}
                        <div className={styles.apiBlock}>
                            <span className={styles.apiBlockTitle}>Bot API Integration</span>
                            <form onSubmit={handleSaveBotToken}>
                                <input 
                                    type="password"
                                    value={botToken}
                                    onChange={e => setBotToken(e.target.value)}
                                    placeholder={envBotToken ? "Environment variable configured" : "Enter Bot Token..."}
                                    className={styles.formInput}
                                />
                                
                                {tokenSuccess && (
                                    <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                                        <Check size={14}/> {tokenSuccess}
                                    </div>
                                )}
                                {tokenError && (
                                    <div className={`${styles.alertBox} ${styles.alertError}`}>
                                        {tokenError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={savingToken}
                                    className={`${styles.primaryBtn} ${styles.fullWidth}`}
                                >
                                    {savingToken ? 'Updating...' : 'Save Bot Token'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Old PDF card removed */}
                </div>
            </div>

            {/* DISPATCH TESTING CENTER */}
            <div className={styles.testingCard} style={{ marginTop: '32px' }}>
                <div className={styles.testingHeader}>
                    <div className={styles.testingTitleSection}>
                        <h2>Dispatch Testing Center</h2>
                        <p>Preview and simulate automated Telegram notifications before live delivery.</p>
                    </div>

                    {/* Multi-Recipient Selector */}
                    <div className={styles.recipientSelectorWrapper}>
                        <span className={styles.selectorLabel}>Send Test To</span>
                        <div className={styles.multiSelectBox}>
                            <button 
                                type="button"
                                onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                                className={styles.multiSelectTrigger}
                            >
                                <span>
                                    {selectedTestTargets.length === 0 
                                        ? 'Select Recipients' 
                                        : `${selectedTestTargets.length} recipient${selectedTestTargets.length > 1 ? 's' : ''} selected`}
                                </span>
                                <Plus size={16} style={{ transform: showTargetDropdown ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }} />
                            </button>

                            {showTargetDropdown && (
                                <div className={styles.multiSelectDropdown}>
                                    {recipients.map(r => (
                                        <label key={r.id} className={styles.dropdownItem}>
                                            <input 
                                                type="checkbox"
                                                checked={selectedTestTargets.includes(r.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTestTargets(prev => [...prev, r.id]);
                                                    } else {
                                                        setSelectedTestTargets(prev => prev.filter(id => id !== r.id));
                                                    }
                                                }}
                                            />
                                            <span>{r.recipient_name} (@{r.telegram_username || r.telegram_chat_id})</span>
                                        </label>
                                    ))}
                                    {recipients.length === 0 && (
                                        <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>No recipients registered</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Advanced Testing Accordion */}
                <div className={styles.advancedTestingAccordion}>
                    <button 
                        type="button"
                        onClick={() => setAdvancedTestingExpanded(!advancedTestingExpanded)}
                        className={styles.advancedTrigger}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={14} />
                            <span>Advanced Testing & Simulation Options</span>
                        </div>
                        <Plus size={14} style={{ transform: advancedTestingExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>

                    {advancedTestingExpanded && (
                        <div className={styles.advancedContent}>
                            <div className={styles.simulationGrid}>
                                <div 
                                    className={`${styles.simulationToggleCard} ${simFail ? styles.simulationToggleCardActive : ''}`}
                                    onClick={() => setSimFail(!simFail)}
                                >
                                    <div className={styles.simulationToggleText}>
                                        <h5>Simulate Failure</h5>
                                        <p>Simulate delivery failure when sending.</p>
                                    </div>
                                    <input type="checkbox" checked={simFail} readOnly style={{ accentColor: 'var(--accent)' }} />
                                </div>

                                <div 
                                    className={`${styles.simulationToggleCard} ${simOverdue ? styles.simulationToggleCardActive : ''}`}
                                    onClick={() => setSimOverdue(!simOverdue)}
                                >
                                    <div className={styles.simulationToggleText}>
                                        <h5>Simulate Overdue</h5>
                                        <p>Add overdue markers to payment reminders.</p>
                                    </div>
                                    <input type="checkbox" checked={simOverdue} readOnly style={{ accentColor: 'var(--accent)' }} />
                                </div>

                                <div 
                                    className={`${styles.simulationToggleCard} ${simEmpty ? styles.simulationToggleCardActive : ''}`}
                                    onClick={() => setSimEmpty(!simEmpty)}
                                >
                                    <div className={styles.simulationToggleText}>
                                        <h5>Simulate Empty State</h5>
                                        <p>Simulate reports/reminders with zero events.</p>
                                    </div>
                                    <input type="checkbox" checked={simEmpty} readOnly style={{ accentColor: 'var(--accent)' }} />
                                </div>

                                <div 
                                    className={`${styles.simulationToggleCard} ${simLargeAmount ? styles.simulationToggleCardActive : ''}`}
                                    onClick={() => setSimLargeAmount(!simLargeAmount)}
                                >
                                    <div className={styles.simulationToggleText}>
                                        <h5>Simulate Large Dues</h5>
                                        <p>Inject large financial summary amounts.</p>
                                    </div>
                                    <input type="checkbox" checked={simLargeAmount} readOnly style={{ accentColor: 'var(--accent)' }} />
                                </div>

                                <div 
                                    className={`${styles.simulationToggleCard} ${simPartial ? styles.simulationToggleCardActive : ''}`}
                                    onClick={() => setSimPartial(!simPartial)}
                                >
                                    <div className={styles.simulationToggleText}>
                                        <h5>Simulate Partial Dues</h5>
                                        <p>Record partially paid status triggers.</p>
                                    </div>
                                    <input type="checkbox" checked={simPartial} readOnly style={{ accentColor: 'var(--accent)' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Grid of 10 Test Cases */}
                <div className={styles.dispatchTestGrid}>
                    {[
                        {
                            type: 'daily_payments',
                            icon: '💰',
                            title: 'Daily Payment Reminder',
                            desc: 'Outstanding dues check dispatched daily at 09:00 AM IST.'
                        },
                        {
                            type: 'weekly_summary',
                            icon: '📊',
                            title: 'Weekly Business Summary',
                            desc: 'Operations report with summary of orders, revenue, and cashflow.'
                        },
                        {
                            type: 'monthly_summary',
                            icon: '📄',
                            title: 'Monthly Financial PDF',
                            desc: 'Detailed financial sheet metrics sent on the 1st of every month.'
                        },
                        {
                            type: 'attendance',
                            icon: '⏰',
                            title: 'Attendance Reminder',
                            desc: 'Alert sent to employees with missing timesheet logs by 10:00 AM IST.'
                        },
                        {
                            type: 'new_order',
                            icon: '📥',
                            title: 'New Order Alert',
                            desc: 'Instant notification when a customer books a new order.'
                        },
                        {
                            type: 'payment_received',
                            icon: '💸',
                            title: 'Payment Received Alert',
                            desc: 'Instant notification when a customer payment is recorded.'
                        },
                        {
                            type: 'order_dispatched',
                            icon: '🚚',
                            title: 'Order Dispatched Alert',
                            desc: 'Alert confirming that an order has left the printing unit.'
                        },
                        {
                            type: 'vendor_payment',
                            icon: '⚠️',
                            title: 'Vendor Payment Alert',
                            desc: 'Warning alert sent for upcoming vendor invoice due dates.'
                        },
                        {
                            type: 'salary_paid',
                            icon: '💵',
                            title: 'Salary Paid Alert',
                            desc: 'Notification sent to employees when payroll is disbursed.'
                        },
                        {
                            type: 'expense_added',
                            icon: '📝',
                            title: 'Expense Added Alert',
                            desc: 'Notification dispatched when an accountant records an expense.'
                        }
                    ].map(card => (
                        <div key={card.type} className={styles.testDispatchCard}>
                            <div className={styles.testCardTop}>
                                <div className={styles.testCardIcon}>{card.icon}</div>
                                <div className={styles.testCardMeta}>
                                    <h4>{card.title}</h4>
                                    <p>{card.desc}</p>
                                </div>
                            </div>
                            <div className={styles.testCardActions}>
                                <button
                                    type="button"
                                    onClick={() => setPreviewingType(card.type)}
                                    className={styles.secondaryBtn}
                                    style={{ height: '38px', borderRadius: '10px', fontSize: '13px' }}
                                >
                                    <Eye size={13} />
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    disabled={sendingType === card.type}
                                    onClick={() => handleSendTestDispatch(card.type)}
                                    className={styles.primaryBtn}
                                    style={{ height: '38px', borderRadius: '10px', fontSize: '13px', background: 'var(--accent)' }}
                                >
                                    <Send size={13} />
                                    {sendingType === card.type ? 'Sending...' : 'Send Test'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Session Test Dispatches Timeline */}
                <div className={styles.timelineSection}>
                    <span className={styles.timelineTitle}>Recent Test Dispatches</span>
                    <div className={styles.timelineFeed}>
                        {testLogs.map(log => (
                            <div key={log.id} className={styles.timelineRow}>
                                <div className={`${styles.timelineDot} ${log.status === 'delivered' ? styles.timelineDotSuccess : styles.timelineDotFailed}`} />
                                <div className={styles.timelineCard}>
                                    <div className={styles.timelineMessage}>
                                        Test <strong>{log.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong> sent to <strong>{log.recipientName}</strong>
                                        {log.error && <span style={{ color: '#FF3B30', fontSize: '11px', display: 'block', marginTop: '2px' }}>✖ {log.error}</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.logTime} style={{ margin: 0 }}>{log.time}</span>
                                        <span className={`${styles.timelineStatus} ${log.status === 'delivered' ? styles.timelineStatusDelivered : styles.timelineStatusFailed}`}>
                                            {log.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ADD RECIPIENT MODAL */}
            {showAddModal && (
                <div className="global-modal-overlay">
                    <div className="global-modal-content">
                        {/* Header */}
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>
                                <h3>Add Notification Recipient</h3>
                                <p>Register a team member to direct system dispatches.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className={styles.closeButton}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddRecipient} className={styles.modalForm}>
                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label>Full Name</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={newName} 
                                        onChange={e => setNewName(e.target.value)} 
                                        placeholder="Karan Dhameliya" 
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Telegram Chat ID</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={newChatId} 
                                        onChange={e => setNewChatId(e.target.value)} 
                                        placeholder="9979545340" 
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Telegram Username</label>
                                    <input 
                                        type="text" 
                                        value={newUsername} 
                                        onChange={e => setNewUsername(e.target.value)} 
                                        placeholder="karandhameliya" 
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Role</label>
                                    <select 
                                        value={newRole} 
                                        onChange={e => setNewRole(e.target.value)} 
                                    >
                                        <option>Admin</option>
                                        <option>Manager</option>
                                        <option>Staff</option>
                                    </select>
                                </div>
                            </div>

                            {/* Preferred Language Section */}
                            <div className={styles.langSection}>
                                <div className={styles.langHeader}>
                                    <h4>Preferred Language</h4>
                                    <p>Choose how this recipient receives Telegram notifications and reports.</p>
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={newLangOverride} 
                                            onChange={e => setNewLangOverride(e.target.checked)}
                                            style={{ width: '15px', height: '15px', accentColor: 'var(--accent)' }}
                                        />
                                        Use Role Language Default ({roleDefaults[newRole] === 'gujarati' ? '🇮🇳 ગુજરાતી' : '🇺🇸 English'})
                                    </label>
                                </div>

                                <div className={styles.langCardsGrid}>
                                    <div 
                                        className={`${styles.langCard} ${(!newLangOverride && newPreferredLang === 'english') || (newLangOverride && roleDefaults[newRole] !== 'gujarati') ? styles.langCardActive : ''} ${newLangOverride ? styles.langCardDisabled : ''}`}
                                        onClick={() => { if (!newLangOverride) setNewPreferredLang('english'); }}
                                    >
                                        <span className={styles.langFlag}>🇺🇸</span>
                                        <div className={styles.langInfo}>
                                            <h5>English</h5>
                                            <p>Professional English notifications</p>
                                        </div>
                                        {((!newLangOverride && newPreferredLang === 'english') || (newLangOverride && roleDefaults[newRole] !== 'gujarati')) && (
                                            <div className={styles.langCheck}><Check size={10} strokeWidth={3} /></div>
                                        )}
                                    </div>
                                    <div 
                                        className={`${styles.langCard} ${(!newLangOverride && newPreferredLang === 'gujarati') || (newLangOverride && roleDefaults[newRole] === 'gujarati') ? styles.langCardActive : ''} ${newLangOverride ? styles.langCardDisabled : ''}`}
                                        onClick={() => { if (!newLangOverride) setNewPreferredLang('gujarati'); }}
                                    >
                                        <span className={styles.langFlag}>🇮🇳</span>
                                        <div className={styles.langInfo}>
                                            <h5>ગુજરાતી</h5>
                                            <p>ગુજરાતીમાં વ્યવસાયિક સૂચનાઓ</p>
                                        </div>
                                        {((!newLangOverride && newPreferredLang === 'gujarati') || (newLangOverride && roleDefaults[newRole] === 'gujarati')) && (
                                            <div className={styles.langCheck}><Check size={10} strokeWidth={3} /></div>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.tgPreviewContainer}>
                                    <span className={styles.tgPreviewTitle}>Live Telegram Preview</span>
                                    <div className={styles.tgBubble}>
                                        <div className={styles.tgHeader}>
                                            <div className={styles.tgAvatar}>FB</div>
                                            <div className={styles.tgMeta}>
                                                <span className={styles.tgBotName}>FabricOS Bot</span>
                                                <span className={styles.tgBotHandle}>@FabricOSBot</span>
                                            </div>
                                        </div>
                                        <div className={styles.tgMessage}>
                                            {((!newLangOverride && newPreferredLang === 'gujarati') || (newLangOverride && roleDefaults[newRole] === 'gujarati')) ? (
                                                <>
                                                    💰 <b>FabricOS — શુભ સવાર</b><br/><br/>
                                                    આજે વસૂલાત બાકી<br/>
                                                    • કરણ — ₹34,600<br/>
                                                    • આદિત્ય હબ — ₹15,300<br/><br/>
                                                    કુલ વસૂલાત: ₹49,900
                                                </>
                                            ) : (
                                                <>
                                                    💰 <b>FabricOS — Good Morning</b><br/><br/>
                                                    Payments Due Today<br/>
                                                    • Karan — ₹34,600<br/>
                                                    • Aditya Hub — ₹15,300<br/><br/>
                                                    Total to collect: ₹49,900
                                                </>
                                            )}
                                        </div>
                                        <div className={styles.tgFooter}>
                                            <span>10:00 AM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Granular notification access */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Notification Access</label>
                                <div className={styles.accessGrid}>
                                    {[
                                        { key: 'daily_payments', label: 'Daily Reminders', desc: 'Outstanding balances reminders.' },
                                        { key: 'attendance_reminder', label: 'Attendance Alerts', desc: 'Daily missing sheets flags.' },
                                        { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Business PDF reports.' },
                                        { key: 'monthly_summary', label: 'Monthly Summary', desc: 'Financial summaries.' },
                                        { key: 'instant_order_alerts', label: 'Instant Alerts', desc: 'Immediate sales logs.' },
                                        { key: 'vendor_alerts', label: 'Vendor Alerts', desc: 'Pending bills due notifications.' }
                                    ].map(item => {
                                        const isActive = (newPrefs as any)[item.key] === 1;
                                        return (
                                            <label 
                                                key={item.key} 
                                                className={`${styles.checkboxCard} ${isActive ? styles.checkboxCardActive : ''}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isActive}
                                                    onChange={e => setNewPrefs(prev => ({ ...prev, [item.key]: e.target.checked ? 1 : 0 }))}
                                                />
                                                <div className={styles.checkboxDetails}>
                                                    <h5>{item.label}</h5>
                                                    <p>{item.desc}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Form footer actions */}
                            <div className={styles.modalFooter}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddModal(false)} 
                                    className={styles.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={adding} 
                                    className={styles.submitBtn}
                                >
                                    {adding ? 'Registering...' : <><Save size={16}/> Save Recipient</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT RECIPIENT MODAL */}
            {editingRecipient && (
                <div className="global-modal-overlay">
                    <div className="global-modal-content">
                        {/* Header */}
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>
                                <h3>Edit Recipient & Preferences</h3>
                                <p>Modify details and toggle notification alert permissions.</p>
                            </div>
                            <button onClick={() => setEditingRecipient(null)} className={styles.closeButton}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleEditRecipientSubmit} className={styles.modalForm}>
                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label>Full Name</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={editName} 
                                        onChange={e => setEditName(e.target.value)} 
                                        placeholder="Karan Dhameliya" 
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Telegram Chat ID</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={editChatId} 
                                        onChange={e => setEditChatId(e.target.value)} 
                                        placeholder="9979545340" 
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Telegram Username</label>
                                    <input 
                                        type="text" 
                                        value={editUsername} 
                                        onChange={e => setEditUsername(e.target.value)} 
                                        placeholder="karandhameliya" 
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Role</label>
                                    <select 
                                        value={editRole} 
                                        onChange={e => setEditRole(e.target.value)} 
                                    >
                                        <option>Admin</option>
                                        <option>Manager</option>
                                        <option>Staff</option>
                                    </select>
                                </div>
                            </div>

                            {/* Global Alert Toggle inside modal */}
                            <div className={styles.formField} style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-grouped)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-primary)', cursor: 'pointer' }}>
                                    <div>
                                        <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Allow Notifications</h5>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>Master switch to enable/disable alerts for this recipient.</p>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={editEnabled === 1}
                                        onChange={e => setEditEnabled(e.target.checked ? 1 : 0)}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                                    />
                                </label>
                            </div>

                            {/* Preferred Language Section */}
                            <div className={styles.langSection}>
                                <div className={styles.langHeader}>
                                    <h4>Preferred Language</h4>
                                    <p>Choose how this recipient receives Telegram notifications and reports.</p>
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={editLangOverride} 
                                            onChange={e => setEditLangOverride(e.target.checked)}
                                            style={{ width: '15px', height: '15px', accentColor: 'var(--accent)' }}
                                        />
                                        Use Role Language Default ({roleDefaults[editRole] === 'gujarati' ? '🇮🇳 ગુજરાતી' : '🇺🇸 English'})
                                    </label>
                                </div>

                                <div className={styles.langCardsGrid}>
                                    <div 
                                        className={`${styles.langCard} ${(!editLangOverride && editPreferredLang === 'english') || (editLangOverride && roleDefaults[editRole] !== 'gujarati') ? styles.langCardActive : ''} ${editLangOverride ? styles.langCardDisabled : ''}`}
                                        onClick={() => { if (!editLangOverride) setEditPreferredLang('english'); }}
                                    >
                                        <span className={styles.langFlag}>🇺🇸</span>
                                        <div className={styles.langInfo}>
                                            <h5>English</h5>
                                            <p>Professional English notifications</p>
                                        </div>
                                        {((!editLangOverride && editPreferredLang === 'english') || (editLangOverride && roleDefaults[editRole] !== 'gujarati')) && (
                                            <div className={styles.langCheck}><Check size={10} strokeWidth={3} /></div>
                                        )}
                                    </div>
                                    <div 
                                        className={`${styles.langCard} ${(!editLangOverride && editPreferredLang === 'gujarati') || (editLangOverride && roleDefaults[editRole] === 'gujarati') ? styles.langCardActive : ''} ${editLangOverride ? styles.langCardDisabled : ''}`}
                                        onClick={() => { if (!editLangOverride) setEditPreferredLang('gujarati'); }}
                                    >
                                        <span className={styles.langFlag}>🇮🇳</span>
                                        <div className={styles.langInfo}>
                                            <h5>ગુજરાતી</h5>
                                            <p>ગુજરાતીમાં વ્યવસાયિક સૂચનાઓ</p>
                                        </div>
                                        {((!editLangOverride && editPreferredLang === 'gujarati') || (editLangOverride && roleDefaults[editRole] === 'gujarati')) && (
                                            <div className={styles.langCheck}><Check size={10} strokeWidth={3} /></div>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.tgPreviewContainer}>
                                    <span className={styles.tgPreviewTitle}>Live Telegram Preview</span>
                                    <div className={styles.tgBubble}>
                                        <div className={styles.tgHeader}>
                                            <div className={styles.tgAvatar}>FB</div>
                                            <div className={styles.tgMeta}>
                                                <span className={styles.tgBotName}>FabricOS Bot</span>
                                                <span className={styles.tgBotHandle}>@FabricOSBot</span>
                                            </div>
                                        </div>
                                        <div className={styles.tgMessage}>
                                            {((!editLangOverride && editPreferredLang === 'gujarati') || (editLangOverride && roleDefaults[editRole] === 'gujarati')) ? (
                                                <>
                                                    💰 <b>FabricOS — શુભ સવાર</b><br/><br/>
                                                    આજે વસૂલાત બાકી<br/>
                                                    • કરણ — ₹34,600<br/>
                                                    • આદિત્ય હબ — ₹15,300<br/><br/>
                                                    કુલ વસૂલાત: ₹49,900
                                                </>
                                            ) : (
                                                <>
                                                    💰 <b>FabricOS — Good Morning</b><br/><br/>
                                                    Payments Due Today<br/>
                                                    • Karan — ₹34,600<br/>
                                                    • Aditya Hub — ₹15,300<br/><br/>
                                                    Total to collect: ₹49,900
                                                </>
                                            )}
                                        </div>
                                        <div className={styles.tgFooter}>
                                            <span>10:00 AM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Granular notification access */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Notification Access</label>
                                <div className={styles.accessGrid}>
                                    {[
                                        { key: 'daily_payments', label: 'Daily Reminders', desc: 'Outstanding balances reminders.' },
                                        { key: 'attendance_reminder', label: 'Attendance Alerts', desc: 'Daily missing sheets flags.' },
                                        { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Business PDF reports.' },
                                        { key: 'monthly_summary', label: 'Monthly Summary', desc: 'Financial summaries.' },
                                        { key: 'instant_order_alerts', label: 'Instant Alerts', desc: 'Immediate sales logs.' },
                                        { key: 'vendor_alerts', label: 'Vendor Alerts', desc: 'Pending bills due notifications.' }
                                    ].map(item => {
                                        const isActive = (editPrefs as any)[item.key] === 1;
                                        return (
                                            <label 
                                                key={item.key} 
                                                className={`${styles.checkboxCard} ${isActive ? styles.checkboxCardActive : ''}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isActive}
                                                    onChange={e => setEditPrefs(prev => ({ ...prev, [item.key]: e.target.checked ? 1 : 0 }))}
                                                />
                                                <div className={styles.checkboxDetails}>
                                                    <h5>{item.label}</h5>
                                                    <p>{item.desc}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Form footer actions */}
                            <div className={styles.modalFooter}>
                                <button 
                                    type="button" 
                                    onClick={() => setEditingRecipient(null)} 
                                    className={styles.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={savingEdit} 
                                    className={styles.submitBtn}
                                    style={{ background: 'var(--accent)' }}
                                >
                                    {savingEdit ? 'Saving...' : <><Save size={16}/> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TELEGRAM PREVIEW MODAL */}
            {previewingType && (
                <div className="global-modal-overlay" onClick={() => setPreviewingType(null)}>
                    <div 
                        className={`global-modal-content ${styles.previewModalContent}`} 
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
                    >
                        {/* Modal Header */}
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>
                                <h3>Notification Dispatch Preview</h3>
                                <p>Simulating delivery payload check.</p>
                            </div>
                            <button onClick={() => setPreviewingType(null)} className={styles.closeButton}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: previewingType === 'monthly_summary' ? '1fr 1fr' : '1fr', gap: '20px' }}>
                            
                            {/* Left Panel for Monthly Summary PDF Mockup */}
                            {previewingType === 'monthly_summary' && (
                                <div className={styles.reportMockupCard}>
                                    <div className={styles.reportMockupHeader}>
                                        <h3>FabricOS Report</h3>
                                        <span>SYSTEM GEN</span>
                                    </div>
                                    <div className={styles.reportMockupCover}>
                                        <h4>Financial Summary</h4>
                                        <p>Period: May 2026</p>
                                    </div>
                                    <div className={styles.reportMockupGrid}>
                                        <div className={styles.reportMockupBlock}>
                                            <span className={styles.reportMockupBlockLabel}>Revenue</span>
                                            <span className={styles.reportMockupBlockVal} style={{ color: '#34C759' }}>
                                                {simLargeAmount ? '₹12,45,000' : '₹4,80,000'}
                                            </span>
                                        </div>
                                        <div className={styles.reportMockupBlock}>
                                            <span className={styles.reportMockupBlockLabel}>Expenses</span>
                                            <span className={styles.reportMockupBlockVal} style={{ color: '#FF3B30' }}>
                                                {simLargeAmount ? '₹2,10,000' : '₹1,20,000'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.reportMockupChart}>
                                        <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Cashflow Progression</span>
                                        <div className={styles.chartBarWrapper}>
                                            <div className={styles.chartBar} style={{ height: '15px' }} />
                                            <div className={styles.chartBar} style={{ height: '24px' }} />
                                            <div className={styles.chartBar} style={{ height: '35px' }} />
                                            <div className={styles.chartBar} style={{ height: '40px' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Right Panel/Telegram Phone Preview */}
                            <div>
                                <span className={styles.selectorLabel} style={{ marginBottom: '8px', display: 'block' }}>Telegram Messenger Live Render</span>
                                <div className={styles.telegramContainer}>
                                    <div className={styles.telegramHeader}>
                                        <div className={styles.telegramAvatar}>🤖</div>
                                        <div className={styles.telegramTitleSection}>
                                            <h4>FabricOS Bot</h4>
                                            <span>bot</span>
                                        </div>
                                    </div>
                                    <div className={styles.telegramBody}>
                                        <div className={styles.telegramBubble}>
                                            <span className={styles.telegramBubbleHeader}>FabricOS Notification Dispatcher</span>
                                            
                                            {/* Monthly Summary PDF File Card */}
                                            {previewingType === 'monthly_summary' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F0F4F8', border: '1px solid #D2DCF0', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px' }}>PDF</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#212121' }}>Financial_Summary_May_2026.pdf</span>
                                                        <span style={{ fontSize: '9px', color: '#757575' }}>1.2 MB • document</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={styles.telegramBubbleText}>
                                                {getTelegramPreviewContent(previewingType)}
                                            </div>
                                            <span className={styles.telegramTime}>
                                                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className={styles.modalHeader} style={{ justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-primary)', borderBottom: 'none', background: 'var(--bg-card)' }}>
                            <button
                                type="button"
                                onClick={() => setPreviewingType(null)}
                                className={styles.secondaryBtn}
                            >
                                Close Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleSendTestDispatch(previewingType);
                                    setPreviewingType(null);
                                }}
                                className={styles.primaryBtn}
                                style={{ background: 'var(--accent)' }}
                            >
                                <Send size={14} />
                                Send Test
                            </button>
                        </div>
                    </div>
                </div>
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
