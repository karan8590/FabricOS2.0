'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FileText, Plus, Search, Filter, AlertCircle, X,
    FileDown, Send, CheckCircle2, ChevronRight, PackageOpen
} from 'lucide-react';
import GenerateChallanModal from '@/components/challans/GenerateChallanModal';

export default function ChallansPage() {
    const [challans, setChallans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    const [stats, setStats] = useState({ total: 0, jobwork: 0, dispatch: 0 });

    const fetchChallans = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterType !== 'all') params.append('type', filterType);
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (searchQuery) params.append('search', searchQuery);

            const res = await fetch(`/api/challans?${params}`);
            if (!res.ok) throw new Error('Failed to fetch challans');
            
            const data = await res.json();
            setChallans(data.challans || []);
            
            // Calculate stats if we're viewing all
            if (filterType === 'all' && filterStatus === 'all' && !searchQuery) {
                const currentMonth = new Date().getMonth();
                const thisMonth = data.challans.filter((c: any) => new Date(c.date).getMonth() === currentMonth);
                setStats({
                    total: thisMonth.length,
                    jobwork: thisMonth.filter((c: any) => c.challan_type === 'jobwork').length,
                    dispatch: thisMonth.filter((c: any) => c.challan_type === 'dispatch').length
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChallans();
    }, [filterType, filterStatus, searchQuery]);

    const handleCloseChallan = async (id: number) => {
        if (!confirm('Are you sure you want to close this challan?')) return;
        try {
            const res = await fetch(`/api/challans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'close' })
            });
            if (res.ok) {
                fetchChallans();
            } else {
                alert('Failed to close challan');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'jobwork': return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">Job Work</span>;
            case 'dispatch': return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-100">Dispatch</span>;
            case 'sample': return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-md border border-orange-100">Sample</span>;
            default: return <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-xs font-semibold rounded-md border border-gray-100">{type}</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-100">Open</span>;
            case 'closed': return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-100">Closed</span>;
            case 'cancelled': return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-md border border-rose-100">Cancelled</span>;
            default: return null;
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="space-y-1 md:space-y-2">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Delivery Challans</h1>
                    <p className="text-sm text-slate-500">Track all fabric movements to vendors and customers</p>
                </div>
                <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="h-11 px-6 bg-accent hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow"
                >
                    <Plus size={18} />
                    Generate Challan
                </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Total Challans (This Month)</div>
                    <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                </div>
                <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Job Work Challans</div>
                    <div className="text-3xl font-bold text-blue-600">{stats.jobwork}</div>
                </div>
                <div className="bg-bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Dispatch Challans</div>
                    <div className="text-3xl font-bold text-purple-600">{stats.dispatch}</div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between bg-bg-surface p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search challan, vendor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm transition-all outline-none"
                        />
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={16} className="text-slate-400 mr-1" />
                    {['all', 'jobwork', 'dispatch', 'sample'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === type ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    {['all', 'open', 'closed'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === status ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-800">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Desktop Table view */}
            <div className="hidden md:block bg-bg-surface border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Challan No.</th>
                                <th className="px-5 py-4 whitespace-nowrap">Date</th>
                                <th className="px-5 py-4 whitespace-nowrap">Type</th>
                                <th className="px-5 py-4 min-w-[200px]">Sent To</th>
                                <th className="px-5 py-4 whitespace-nowrap">Qty / Value</th>
                                <th className="px-5 py-4 whitespace-nowrap">Status</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-500 font-medium">Loading challans...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : challans.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No challans found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : challans.map((challan) => (
                                <tr key={challan.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-4 font-bold text-slate-900">{challan.challan_number}</td>
                                    <td className="px-5 py-4 text-slate-500">{new Date(challan.date).toLocaleDateString('en-IN')}</td>
                                    <td className="px-5 py-4">{getTypeBadge(challan.challan_type)}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-slate-900">{challan.to_name}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{challan.to_address}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-semibold">{challan.total_quantity} m</div>
                                        <div className="text-xs text-slate-500">₹{challan.total_value}</div>
                                    </td>
                                    <td className="px-5 py-4">{getStatusBadge(challan.status)}</td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* We can wire PDF generation directly or navigate to a view page */}
                                            {challan.status === 'open' && (
                                                <button 
                                                    onClick={() => handleCloseChallan(challan.id)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                    title="Mark Closed"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card view - Simplified for brevity */}
            <div className="md:hidden space-y-3">
                {/* Standard mobile card list rendering */}
                {challans.map(challan => (
                    <div key={challan.id} className="bg-bg-surface p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="font-bold text-slate-900">{challan.challan_number}</div>
                            {getStatusBadge(challan.status)}
                        </div>
                        <div className="flex gap-2 text-xs">
                            {getTypeBadge(challan.challan_type)}
                            <span className="text-slate-500">{new Date(challan.date).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <div className="font-medium text-sm">{challan.to_name}</div>
                            <div className="text-slate-500 text-xs mt-1">{challan.total_quantity} m • ₹{challan.total_value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {isGenerateModalOpen && (
                <GenerateChallanModal 
                    isOpen={isGenerateModalOpen} 
                    onClose={() => setIsGenerateModalOpen(false)}
                    onSuccess={() => {
                        setIsGenerateModalOpen(false);
                        fetchChallans();
                    }}
                />
            )}
        </div>
    );
}
