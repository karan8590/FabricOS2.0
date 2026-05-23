'use client';

import { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Trash2, Plus } from 'lucide-react';
import { generateChallanPdf } from '@/lib/pdf/challanPdf';

interface GenerateChallanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    defaultType?: 'jobwork' | 'dispatch' | 'sample';
    linkedOrderData?: any;
    linkedJobWorkData?: any;
}

export default function GenerateChallanModal({ 
    isOpen, onClose, onSuccess, 
    defaultType = 'dispatch',
    linkedOrderData = null,
    linkedJobWorkData = null
}: GenerateChallanModalProps) {
    const [challanType, setChallanType] = useState<'jobwork' | 'dispatch' | 'sample'>(defaultType);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [purpose, setPurpose] = useState('');
    const [vehicleNo, setVehicleNo] = useState('');
    const [transporter, setTransporter] = useState('');
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    
    // Company / From details
    const [fromName, setFromName] = useState('');
    const [fromAddress, setFromAddress] = useState('');
    const [fromGstin, setFromGstin] = useState('');
    
    // Receiver / To details
    const [toName, setToName] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [toGstin, setToGstin] = useState('');
    
    const [items, setItems] = useState([{ description: '', quantity: '', unit: 'm', value: '' }]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        
        // Fetch Company details from Settings
        fetch('/api/settings/gst')
            .then(res => res.json())
            .then(data => {
                if (data.settings) {
                    setFromName(data.settings.legal_name || 'FabricOS Company');
                    setFromAddress(data.settings.address || '');
                    setFromGstin(data.settings.gstin || '');
                }
            })
            .catch(console.error);

        // Pre-fill based on linked data
        if (linkedOrderData) {
            setToName(linkedOrderData.customer_name || '');
            // address / gstin would ideally come from the customer object
            
            if (challanType === 'dispatch') {
                setPurpose('Dispatch against Order #' + linkedOrderData.order_number);
                setItems([{
                    description: linkedOrderData.design_name || 'Fabric',
                    quantity: linkedOrderData.quantity_meters || '',
                    unit: 'm',
                    value: linkedOrderData.total_price || ''
                }]);
            }
        }
        
        if (linkedJobWorkData) {
            setToName(linkedJobWorkData.vendor_name || '');
            setPurpose('Job Work - ' + (linkedJobWorkData.type || ''));
            setItems([{
                description: 'Raw Fabric for ' + (linkedJobWorkData.type || 'Job Work'),
                quantity: linkedJobWorkData.metres || '',
                unit: 'm',
                value: linkedJobWorkData.total_cost || ''
            }]);
        }
        
        if (challanType === 'sample' && !purpose) {
            setPurpose('Sample for approval');
        }
    }, [isOpen, linkedOrderData, linkedJobWorkData, challanType]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Clean items
            const cleanedItems = items.filter(i => i.description && i.quantity);
            if (cleanedItems.length === 0) {
                throw new Error('At least one item with description and quantity is required');
            }

            const payload = {
                challan_type: challanType,
                date,
                order_id: linkedOrderData?.id,
                order_number: linkedOrderData?.order_number,
                linked_job_work_id: linkedJobWorkData?.id,
                from_name: fromName,
                from_address: fromAddress,
                from_gstin: fromGstin,
                to_name: toName,
                to_address: toAddress,
                to_gstin: toGstin,
                purpose,
                vehicle_number: vehicleNo,
                transporter,
                expected_return_date: expectedReturnDate || undefined,
                items: cleanedItems
            };

            const res = await fetch('/api/challans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate challan');
            }

            const resData = await res.json();
            
            // Generate PDF
            const pdfDoc = generateChallanPdf({
                challan_number: resData.challanNumber,
                ...payload,
                total_quantity: cleanedItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0),
                total_value: cleanedItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0)
            });
            
            // Save locally
            pdfDoc.save(`${resData.challanNumber}.pdf`);

            // Also try to send Telegram if backend handles it or we could upload it.
            // For now, downloading is sufficient.

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => setItems([...items, { description: '', quantity: '', unit: 'm', value: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg-surface w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200/80">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <FileText className="text-accent w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Generate Delivery Challan</h2>
                            <p className="text-sm text-slate-500">Record movement of goods</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-rose-800 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase">Challan Type</label>
                            <select 
                                value={challanType} 
                                onChange={(e) => setChallanType(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                                <option value="dispatch">Dispatch (To Customer)</option>
                                <option value="jobwork">Job Work (To Vendor)</option>
                                <option value="sample">Sample (To Customer)</option>
                            </select>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase">Date</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Send To (Receiver)</h3>
                            <input 
                                type="text" placeholder="Receiver Name" value={toName} onChange={e => setToName(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                            <textarea 
                                rows={2} placeholder="Receiver Address" value={toAddress} onChange={e => setToAddress(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                            <input 
                                type="text" placeholder="Receiver GSTIN (Optional)" value={toGstin} onChange={e => setToGstin(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono"
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Logistics Details</h3>
                            <input 
                                type="text" placeholder="Purpose of movement" value={purpose} onChange={e => setPurpose(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                            <input 
                                type="text" placeholder="Vehicle No. (Optional)" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm uppercase"
                            />
                            <input 
                                type="text" placeholder="Transporter Name (Optional)" value={transporter} onChange={e => setTransporter(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                            {challanType === 'jobwork' && (
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Expected Return Date</label>
                                    <input 
                                        type="date" value={expectedReturnDate} onChange={e => setExpectedReturnDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800">Item Details</h3>
                            <button onClick={addItem} type="button" className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md flex items-center gap-1">
                                <Plus size={14} /> Add Item
                            </button>
                        </div>
                        
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                                    <tr>
                                        <th className="px-3 py-2">Description</th>
                                        <th className="px-3 py-2 w-24">Qty</th>
                                        <th className="px-3 py-2 w-20">Unit</th>
                                        <th className="px-3 py-2 w-28">Value (₹)</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="text" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent border border-slate-200 focus:border-indigo-500 rounded-md outline-none"
                                                    placeholder="Fabric name..."
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent border border-slate-200 focus:border-indigo-500 rounded-md outline-none"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="text" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent border border-slate-200 focus:border-indigo-500 rounded-md outline-none text-center"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="number" value={item.value} onChange={e => updateItem(index, 'value', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent border border-slate-200 focus:border-indigo-500 rounded-md outline-none"
                                                    placeholder="Optional"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {items.length > 1 && (
                                                    <button onClick={() => removeItem(index)} type="button" className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-md">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-accent hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate & Download PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}
