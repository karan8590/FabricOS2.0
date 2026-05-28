'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Building2, MapPin, Hash, CheckCircle2, AlertTriangle, 
    User, Lock, LogOut, Send, Clock, Upload, ArrowRight 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [gstin, setGstin] = useState('');
    const [legalName, setLegalName] = useState('');
    const [address, setAddress] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        async function fetchGSTSettings() {
            try {
                const res = await fetch('/api/settings/gst');
                if (res.ok) {
                    const data = await res.json();
                    if (data.settings) {
                        setGstin(data.settings.gstin || '');
                        setLegalName(data.settings.legal_name || '');
                        setAddress(data.settings.address || '');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch GST settings:', err);
            } finally {
                setFetching(false);
            }
        }
        fetchGSTSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const cleanGstin = gstin.trim().toUpperCase();
        if (cleanGstin) {
            if (cleanGstin.length !== 15) {
                setMessage({ type: 'error', text: 'GSTIN must be exactly 15 characters long.' });
                setLoading(false);
                return;
            }
            if (!cleanGstin.startsWith('24')) {
                setMessage({ type: 'error', text: 'GSTIN must start with state code 24 for Gujarat.' });
                setLoading(false);
                return;
            }
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstinRegex.test(cleanGstin)) {
                setMessage({ type: 'error', text: 'Invalid GSTIN format. Correct format example: 24AAAAA0000A1Z5' });
                setLoading(false);
                return;
            }
        }

        try {
            const res = await fetch('/api/settings/gst', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gstin: cleanGstin,
                    legal_name: legalName,
                    address,
                    state: 'Gujarat',
                    state_code: '24'
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessage({ type: 'success', text: 'Business profile updated successfully' });
                setGstin(data.settings.gstin);
                setLegalName(data.settings.legal_name);
                setAddress(data.settings.address);
            } else {
                const errData = await res.json();
                setMessage({ type: 'error', text: errData.error || 'Failed to update profile' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected connection error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <div className="max-w-[900px] mx-auto px-6 py-10 space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="space-y-2 border-b border-slate-100 pb-6">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500">Manage your business profile, account preferences, and integrations.</p>
            </div>

            {/* 1. Business Profile Section */}
            <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                    <Building2 className="text-slate-700 w-5 h-5" />
                    <h3 className="text-lg font-semibold text-slate-900">Business Profile</h3>
                </div>

                {fetching ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        {message && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                                message.type === 'success' 
                                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                                    : 'bg-rose-50/50 border-rose-100 text-rose-800'
                            }`}>
                                {message.type === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <span className="text-sm font-medium">{message.text}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Business Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Enter legal business name"
                                        value={legalName}
                                        onChange={(e) => setLegalName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">GSTIN</label>
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="15-character GSTIN"
                                        value={gstin}
                                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                                        maxLength={15}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl text-sm font-mono transition-all outline-none text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Business Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                                <textarea
                                    rows={2}
                                    placeholder="Enter registered address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl text-sm transition-all outline-none text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Logo (Optional)</label>
                            <div className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Upload className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="text-sm font-medium text-slate-600">Click to upload business logo</span>
                                <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-10 px-6 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* 2. Account Section */}
            <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-2">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <User className="text-slate-700 w-5 h-5" />
                    <h3 className="text-lg font-semibold text-slate-900">Account</h3>
                </div>

                <div className="divide-y divide-slate-100">
                    <div className="py-4 flex items-center justify-between hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Profile Information</p>
                                <p className="text-xs text-slate-500">{user?.name || 'Loading...'} ({user?.role})</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="py-4 flex items-center justify-between hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Change Password</p>
                                <p className="text-xs text-slate-500">Update your security credentials</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>

                    <div 
                        onClick={handleLogout}
                        className="py-4 flex items-center justify-between hover:bg-rose-50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center transition-colors">
                                <LogOut className="w-4 h-4 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-rose-600">Sign Out</p>
                                <p className="text-xs text-rose-500/80">Log out of your FabricOS account</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Integrations Section */}
            <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-2">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <Send className="text-slate-700 w-5 h-5" />
                    <h3 className="text-lg font-semibold text-slate-900">Integrations</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/telegram-center" className="block p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group cursor-pointer">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Send className="text-indigo-600 w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Telegram Center</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">Manage automated notifications and alerts for your team via Telegram.</p>
                            </div>
                        </div>
                    </Link>

                    <div className="block p-4 rounded-xl border border-slate-200 bg-slate-50/50 opacity-80 cursor-not-allowed">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Clock className="text-slate-500 w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-slate-900">Attendance Machine</h4>
                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">COMING SOON</span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">Sync biometric attendance directly into FabricOS employee records.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
