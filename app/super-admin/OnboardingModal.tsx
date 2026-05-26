import React, { useState } from 'react';
import { Building2, Plus, Trash2, Shield, Settings, Store, XCircle } from 'lucide-react';

interface OnboardingModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function OnboardingModal({ onClose, onSuccess }: OnboardingModalProps) {
    const [structure, setStructure] = useState<'single' | 'multi' | null>(null);
    const [step, setStep] = useState(1);
    
    // Single Firm State
    const [singleFirm, setSingleFirm] = useState({
        name: '', gstin: '', phone: '', email: '', address: '', logoUrl: ''
    });

    // Multi Firm State
    const [workspace, setWorkspace] = useState({
        name: '', ownerName: '', logoUrl: ''
    });
    
    const [firms, setFirms] = useState([{
        id: Date.now(), name: '', gstin: '', phone: '', email: '', address: '', logoUrl: ''
    }]);

    // Admin State (Shared)
    const [admin, setAdmin] = useState({
        adminName: '', phone: '', password: '', plan: 'Starter'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                structure,
                name: structure === 'single' ? singleFirm.name : workspace.name,
                gstin: structure === 'single' ? singleFirm.gstin : null,
                address: structure === 'single' ? singleFirm.address : null,
                phone: structure === 'single' ? singleFirm.phone : admin.phone,
                logoUrl: structure === 'single' ? singleFirm.logoUrl : workspace.logoUrl,
                adminName: admin.adminName,
                password: admin.password,
                plan: admin.plan,
                firms: structure === 'multi' ? firms : undefined
            };

            const res = await fetch('/api/super-admin/businesses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert('Failed to create workspace');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addFirm = () => setFirms([...firms, { id: Date.now(), name: '', gstin: '', phone: '', email: '', address: '', logoUrl: '' }]);
    const removeFirm = (id: number) => setFirms(firms.filter(f => f.id !== id));
    
    const updateFirm = (id: number, field: string, value: string) => {
        setFirms(firms.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', padding: '16px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0' }}>New Workspace Onboarding</h2>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                        <XCircle size={24} />
                    </button>
                </div>

                <div style={{ padding: '32px' }}>
                    {/* Structure Selection */}
                    {step === 1 && (
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '24px', textAlign: 'center' }}>Select Business Structure</h3>
                            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                                {/* Single Firm Card */}
                                <div 
                                    onClick={() => setStructure('single')}
                                    style={{ flex: 1, maxWidth: '300px', border: structure === 'single' ? '2px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', cursor: 'pointer', backgroundColor: structure === 'single' ? '#eff6ff' : '#fff', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                                >
                                    <Store size={48} color={structure === 'single' ? '#4f46e5' : '#64748b'} style={{ marginBottom: '16px' }} />
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Single Firm</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>One business entity managing its own inventory and billing.</p>
                                </div>

                                {/* Multi Firm Card */}
                                <div 
                                    onClick={() => setStructure('multi')}
                                    style={{ flex: 1, maxWidth: '300px', border: structure === 'multi' ? '2px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', cursor: 'pointer', backgroundColor: structure === 'multi' ? '#eff6ff' : '#fff', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                                >
                                    <Building2 size={48} color={structure === 'multi' ? '#4f46e5' : '#64748b'} style={{ marginBottom: '16px' }} />
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Business Group</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Multiple firms operating under one central workspace.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                                <button 
                                    disabled={!structure}
                                    onClick={() => setStep(2)}
                                    style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: '#fff', backgroundColor: structure ? '#4f46e5' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: structure ? 'pointer' : 'not-allowed' }}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Form Details */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {structure === 'single' ? (
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#4f46e5', marginBottom: '16px' }}>Business Details</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <input placeholder="Business Name *" value={singleFirm.name} onChange={e => setSingleFirm({...singleFirm, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        <input placeholder="GST Number *" value={singleFirm.gstin} onChange={e => setSingleFirm({...singleFirm, gstin: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        <input placeholder="Phone Number" value={singleFirm.phone} onChange={e => setSingleFirm({...singleFirm, phone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        <input placeholder="Email" value={singleFirm.email} onChange={e => setSingleFirm({...singleFirm, email: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        <input placeholder="Address" value={singleFirm.address} onChange={e => setSingleFirm({...singleFirm, address: e.target.value})} style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#4f46e5', marginBottom: '16px' }}>Workspace / Group Details</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <input placeholder="Group / Workspace Name *" value={workspace.name} onChange={e => setWorkspace({...workspace, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                            <input placeholder="Owner Name" value={workspace.ownerName} onChange={e => setWorkspace({...workspace, ownerName: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#4f46e5', margin: 0 }}>Firms</h3>
                                            <button onClick={addFirm} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#eff6ff', color: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                                <Plus size={16} /> Add Firm
                                            </button>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {firms.map((firm, idx) => (
                                                <div key={firm.id} style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc', position: 'relative' }}>
                                                    {firms.length > 1 && (
                                                        <button onClick={() => removeFirm(firm.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#334155' }}>Firm {idx + 1}</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                        <input placeholder="Firm Name *" value={firm.name} onChange={e => updateFirm(firm.id, 'name', e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                                        <input placeholder="GST Number *" value={firm.gstin} onChange={e => updateFirm(firm.id, 'gstin', e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                                        <input placeholder="Phone" value={firm.phone} onChange={e => updateFirm(firm.id, 'phone', e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                                        <input placeholder="Email" value={firm.email} onChange={e => updateFirm(firm.id, 'email', e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                                        <input placeholder="Address" value={firm.address} onChange={e => updateFirm(firm.id, 'address', e.target.value)} style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ height: '1px', backgroundColor: '#e2e8f0' }} />

                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#4f46e5', marginBottom: '16px' }}>Admin Account</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <input placeholder="Admin Name *" value={admin.adminName} onChange={e => setAdmin({...admin, adminName: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    <input placeholder="Phone Number *" value={admin.phone} onChange={e => setAdmin({...admin, phone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    <input placeholder="Initial Password *" type="password" value={admin.password} onChange={e => setAdmin({...admin, password: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                                <button onClick={() => setStep(1)} style={{ padding: '12px 24px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                    Back
                                </button>
                                <button onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '12px 32px', background: '#4f46e5', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                                    {isSubmitting ? 'Creating Workspace...' : 'Create Workspace'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
