'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Send, Settings2, ShieldCheck, ArrowRight, Building2, MapPin, Percent, Hash, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
    const [gstin, setGstin] = useState('');
    const [legalName, setLegalName] = useState('');
    const [address, setAddress] = useState('');
    const [defaultRate, setDefaultRate] = useState(5);
    const [hsnCode, setHsnCode] = useState('5407');
    const [filingFrequency, setFilingFrequency] = useState('Monthly');
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
                        setDefaultRate(data.settings.default_rate ?? 5);
                        setHsnCode(data.settings.hsn_code || '5407');
                        setFilingFrequency(data.settings.filing_frequency || 'Monthly');
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

        // Client-side validations
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
                    state_code: '24',
                    default_rate: defaultRate,
                    hsn_code: hsnCode,
                    filing_frequency: filingFrequency
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessage({ type: 'success', text: 'GST Configuration saved successfully!' });
                setGstin(data.settings.gstin);
                setLegalName(data.settings.legal_name);
                setAddress(data.settings.address);
                setDefaultRate(data.settings.default_rate);
                setHsnCode(data.settings.hsn_code);
                setFilingFrequency(data.settings.filing_frequency);
            } else {
                const errData = await res.json();
                setMessage({ type: 'error', text: errData.error || 'Failed to save GST Configuration.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected connection error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[800px] mx-auto px-6 py-10 space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="space-y-2 border-b border-slate-100 pb-6">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">System Settings</h1>
                <p className="text-sm text-slate-500">Configure global configurations, system parameters, and integrations.</p>
            </div>

            {/* Telegram Center Promotion/Redirect Card */}
            <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Send className="text-accent w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-slate-900">Telegram Notification Center</h2>
                        <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
                            Configure recipients, individual team member roles, and granular notification schedules in the standalone Telegram Center.
                        </p>
                    </div>
                </div>
                
                <Link 
                    href="/telegram-center" 
                    className="h-11 px-5 bg-accent hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-sm hover:shadow"
                >
                    Open Telegram Center
                    <ArrowRight size={14} />
                </Link>
            </div>

            {/* GST Configuration Card */}
            <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Building2 className="text-accent w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-950">GST Configuration</h3>
                            <p className="text-xs text-slate-500">Configure business identity, GSTIN, and default tax rates for automated billing.</p>
                        </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        State: Gujarat (24)
                    </span>
                </div>

                {fetching ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-5">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Business Legal Name
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="e.g. Acme Textiles Ltd"
                                        value={legalName}
                                        onChange={(e) => setLegalName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Your GSTIN
                                </label>
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="15-character ID (starts with 24)"
                                        value={gstin}
                                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                                        maxLength={15}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm font-mono transition-all outline-none text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                Business Address
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                                <textarea
                                    rows={2}
                                    placeholder="Enter your registered business address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Default GST Rate (%)
                                </label>
                                <div className="relative">
                                    <Percent className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={defaultRate}
                                        onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Fabric HSN Code
                                </label>
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="e.g. 5407"
                                        value={hsnCode}
                                        onChange={(e) => setHsnCode(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Filing Frequency
                                </label>
                                <div className="relative">
                                    <Settings2 className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                                    <select
                                        value={filingFrequency}
                                        onChange={(e) => setFilingFrequency(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-bg-surface focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-medium appearance-none"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-11 px-6 bg-accent hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? 'Saving Settings...' : 'Save GST Settings'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* General System Configurations (Mock values for visual display) */}
            <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <Settings2 className="text-accent w-5 h-5" />
                    <div>
                        <h3 className="text-base font-semibold text-slate-950">General System Settings</h3>
                        <p className="text-xs text-slate-500">Global parameters for FabricOS operations.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                        <div>
                            <span className="text-sm font-semibold text-slate-800 block">System Mode</span>
                            <span className="text-xs text-slate-500">Runs operations in production.</span>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 uppercase tracking-wide">Production</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                        <div>
                            <span className="text-sm font-semibold text-slate-800 block">Currency Formatter</span>
                            <span className="text-xs text-slate-500">Default symbol for invoices and reports.</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">INR (₹)</span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <span className="text-sm font-semibold text-slate-800 block">Security Auditing</span>
                            <span className="text-xs text-slate-500">Automated safety verification enabled.</span>
                        </div>
                        <span className="font-semibold text-emerald-600 text-xs flex items-center gap-1">
                            <ShieldCheck size={14} /> Active
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
}

