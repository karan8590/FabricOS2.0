const fs = require('fs');

const path = '/Users/karandhameliya/Desktop/ag/FabricOS/app/super-admin/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '{/* Modal */}';
const endMarker = '            )}';

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) throw new Error("Could not find start marker");

// Find the ending marker for the modal block
const afterStart = content.substring(startIndex);
// The block ends with `            )}` after the modal div
const endIndexRelative = afterStart.indexOf('            )}\n        </div>');
if (endIndexRelative === -1) throw new Error("Could not find end marker");
const endIndex = startIndex + endIndexRelative + 15; // include `            )}`

const newModalCode = `{/* Premium Create Business Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '32px 32px 24px 32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)' }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Create New Business</h2>
                                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Set up a new textile business workspace for your team.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleCreateBusiness} style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                
                                {/* Section 1: Business Information */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>1. Business Information</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Business Name *</label>
                                            <input required type="text" value={newBusiness.name} onChange={e => setNewBusiness({...newBusiness, name: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="e.g. Royal Heritage Fabrics" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>GSTIN (Optional)</label>
                                            <input type="text" value={newBusiness.gstin} onChange={e => setNewBusiness({...newBusiness, gstin: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="22AAAAA0000A1Z5" />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Business Address *</label>
                                            <input required type="text" value={newBusiness.address} onChange={e => setNewBusiness({...newBusiness, address: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="Plot No. 45-48, Sachin GIDC, Surat, Gujarat" />
                                        </div>
                                        
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Business Logo (Optional)</label>
                                            <label style={{ 
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', backgroundColor: '#f8fafc',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }} onMouseOver={e => e.currentTarget.style.borderColor = '#4f46e5'} onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                                
                                                {newBusiness.logoUrl ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                        <img src={newBusiness.logoUrl} alt="Logo Preview" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                                                        <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 500 }}>Change image</span>
                                                    </div>
                                                ) : (
                                                    <div style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#64748b' }}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                        </div>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Click to upload or drag & drop</p>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>PNG, JPG, GIF up to 2MB</p>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setNewBusiness({...newBusiness, logoUrl: reader.result as string});
                                                            };
                                                            reader.readAsDataURL(file);
                                                        } else {
                                                            setNewBusiness({...newBusiness, logoUrl: ''});
                                                        }
                                                    }} 
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%' }}></div>

                                {/* Section 2: Admin Account */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>2. Admin Account</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Admin Name *</label>
                                            <input required type="text" value={newBusiness.adminName} onChange={e => setNewBusiness({...newBusiness, adminName: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="e.g. Karan Dhameliya" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Phone Number *</label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '15px', fontWeight: 500 }}>+91</div>
                                                <input 
                                                    required 
                                                    type="tel" 
                                                    pattern="\\d{10}"
                                                    maxLength={10}
                                                    title="Please enter exactly 10 digits"
                                                    value={newBusiness.phone} 
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\\D/g, '');
                                                        setNewBusiness({...newBusiness, phone: val});
                                                    }} 
                                                    style={{ width: '100%', padding: '12px 16px 12px 48px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} 
                                                    onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                    placeholder="9876543210" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Initial Password *</label>
                                            <input required type="password" value={newBusiness.password} onChange={e => setNewBusiness({...newBusiness, password: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'} placeholder="••••••••" />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%' }}></div>

                                {/* Section 3: Subscription & Settings */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>3. Settings</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>Subscription Plan</label>
                                            <div style={{ position: 'relative' }}>
                                                <select value={newBusiness.plan} onChange={e => setNewBusiness({...newBusiness, plan: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', appearance: 'none', backgroundColor: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                                    <option value="Free">Free Tier</option>
                                                    <option value="Starter">Starter Plan</option>
                                                    <option value="Pro">Pro Plan</option>
                                                </select>
                                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '24px 32px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 600, color: '#475569', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: '#fff', backgroundColor: '#4f46e5', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -2px rgba(79, 70, 229, 0.2)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#4338ca'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#4f46e5'}>
                                    Create Business
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}`;

const newContent = content.substring(0, startIndex) + newModalCode + content.substring(endIndex);
fs.writeFileSync(path, newContent, 'utf8');
console.log("Success");
