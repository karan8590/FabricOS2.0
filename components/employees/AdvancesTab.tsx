'use client';

import { useState, useEffect } from 'react';
import styles from './AdvancesTab.module.css';
import { celebrateMedium } from '@/lib/confetti';
import { useToast } from '@/contexts/ToastContext';

interface Employee {
    id: number;
    name: string;
    role: string;
    is_active: number;
}

interface Instalment {
    id: number;
    date: string;
    amount: number;
    note: string;
    createdAt: number;
}

interface TopUp {
    date: string;
    amount: number;
    note: string;
    addedBy?: string | null;
}

interface Advance {
    id: number;
    employeeId: number;
    employeeName: string;
    role: string;
    totalAmount: number;
    amountRepaid: number;
    remainingBalance: number;
    status: 'active' | 'completed';
    note: string | null;
    createdAt: number;
    topUps?: TopUp[];
    instalments: Instalment[];
}

interface AdvancesTabProps {
    employees: Employee[];
}

function formatDateString(dateStr: string) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const d = new Date(year, month, day);
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

export default function AdvancesTab({ employees }: AdvancesTabProps) {
    const { showToast } = useToast();
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');
    const [loading, setLoading] = useState<boolean>(true);

    // New Advance Modal state
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalData, setModalData] = useState({
        employeeId: '',
        totalAmount: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });
    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    // Inline Repayment state per card
    const [activeFormAdvanceId, setActiveFormAdvanceId] = useState<number | null>(null);
    const [inlineData, setInlineData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });
    const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
    
    // History expandable state
    const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

    const activeEmployees = (employees || []).filter(emp => emp.is_active === 1);

    useEffect(() => {
        fetchAdvances();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const fetchAdvances = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/advances?status=${statusFilter}`);
            if (res.ok) {
                const data = await res.json();
                setAdvances(data.advances || []);
            }
        } catch (error) {
            console.error('Failed to load advances:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!modalData.employeeId) newErrors.employeeId = 'Employee selection is required';
        if (!modalData.totalAmount || parseFloat(modalData.totalAmount) <= 0) newErrors.totalAmount = 'Advance amount must be greater than 0';
        if (!modalData.date) newErrors.date = 'Date given is required';

        if (Object.keys(newErrors).length > 0) {
            setModalErrors(newErrors);
            const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
            if (firstErrorField) firstErrorField.focus();
            return;
        }

        const employeeIdInt = parseInt(modalData.employeeId);
        const amountFloat = parseFloat(modalData.totalAmount);
        const activeAdvance = advances.find(
            a => a.employeeId === employeeIdInt && a.status === 'active'
        );

        // Optimistic UI Update
        const emp = activeEmployees.find(e => e.id === employeeIdInt);
        const tempId = Date.now(); // Temporary ID for optimistic UI

        if (activeAdvance) {
            // Optimistically update existing
            setAdvances(prev => prev.map(a => {
                if (a.id === activeAdvance.id) {
                    return {
                        ...a,
                        totalAmount: a.totalAmount + amountFloat,
                        remainingBalance: a.remainingBalance + amountFloat,
                        topUps: [
                            ...(a.topUps || []),
                            {
                                date: modalData.date,
                                amount: amountFloat,
                                note: modalData.note || ''
                            }
                        ]
                    };
                }
                return a;
            }));
        } else {
            // Optimistically add new
            setAdvances(prev => [{
                id: tempId,
                employeeId: employeeIdInt,
                employeeName: emp?.name || 'Unknown',
                role: emp?.role || 'staff',
                totalAmount: amountFloat,
                amountRepaid: 0,
                remainingBalance: amountFloat,
                status: 'active',
                note: modalData.note || null,
                createdAt: Math.floor(Date.now() / 1000),
                topUps: [],
                instalments: []
            }, ...prev]);
        }

        setIsModalOpen(false);
        setModalData({
            employeeId: '',
            totalAmount: '',
            date: new Date().toISOString().split('T')[0],
            note: ''
        });
        setModalErrors({});

        try {
            const res = await fetch('/api/advances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    employeeId: employeeIdInt,
                    totalAmount: amountFloat,
                    date: modalData.date,
                    note: modalData.note
                })
            });

            if (res.ok) {
                showToast(activeAdvance ? 'Advance topped up successfully!' : 'New advance created successfully!', 'success');
                fetchAdvances(); // Re-fetch to get real DB IDs
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to create advance.', 'error');
                fetchAdvances(); // Revert optimistic update
            }
        } catch (error) {
            console.error('Create advance error:', error);
            showToast('Network error occurred.', 'error');
            fetchAdvances(); // Revert optimistic update
        }
    };

    const handleAddInstalment = async (advanceId: number) => {
        const newErrors: Record<string, string> = {};
        if (!inlineData.amount || parseFloat(inlineData.amount) <= 0) newErrors.amount = 'Valid amount is required';
        if (!inlineData.date) newErrors.date = 'Date is required';

        if (Object.keys(newErrors).length > 0) {
            setInlineErrors(newErrors);
            return;
        }

        try {
            const res = await fetch('/api/advances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_instalment',
                    advanceId,
                    amount: parseFloat(inlineData.amount),
                    date: inlineData.date,
                    note: inlineData.note
                })
            });

            if (res.ok) {
                setActiveFormAdvanceId(null);
                
                const adv = advances.find(a => a.id === advanceId);
                if (adv && adv.remainingBalance - parseFloat(inlineData.amount) <= 0) {
                    celebrateMedium(`confetti_advance_${advanceId}`);
                    // We can use a small delay so the alert doesn't block confetti instantly
                    setTimeout(() => console.log(`${adv.employeeName}'s advance has been fully repaid!`), 100);
                }

                setInlineData({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    note: ''
                });
                setInlineErrors({});
                fetchAdvances();
            } else {
                const err = await res.json();
                console.log(err.error || 'Failed to add instalment.');
            }
        } catch (error) {
            console.error('Add instalment error:', error);
        }
    };

    const getRoleLabel = (role: string) => {
        const safeRole = role || 'Staff';
        return safeRole.charAt(0).toUpperCase() + safeRole.slice(1);
    };

    return (
        <div className={styles.tabContainer}>
            {/* Top Filter & Creation row */}
            <div className={styles.headerRow}>
                <div className={styles.filterPills}>
                    <button
                        className={`${styles.filterPill} ${statusFilter === 'active' ? styles.filterPillActive : ''}`}
                        onClick={() => setStatusFilter('active')}
                    >
                        Active
                    </button>
                    <button
                        className={`${styles.filterPill} ${statusFilter === 'completed' ? styles.filterPillActive : ''}`}
                        onClick={() => setStatusFilter('completed')}
                    >
                        Completed
                    </button>
                </div>

                <button className={styles.btnNewAdvance} onClick={() => { setIsModalOpen(true); setModalErrors({}); }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Advance
                </button>
            </div>

            {/* Main Cards list */}
            {loading ? (
                <div className={styles.cardsGrid}>
                    {[1, 2, 3].map(n => (
                        <div key={n} className={styles.advanceCard} style={{ opacity: 0.6, pointerEvents: 'none' }}>
                            <div className={styles.cardHeader}>
                                <div className={styles.employeeCell}>
                                    <div className={styles.avatar} style={{ background: '#E2E8F0', border: 'none' }}></div>
                                    <div className={styles.nameSection} style={{ gap: '6px' }}>
                                        <div style={{ width: '120px', height: '14px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                        <div style={{ width: '80px', height: '10px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                                <div style={{ width: '60px', height: '20px', background: '#E2E8F0', borderRadius: '10px' }}></div>
                            </div>
                            <div className={styles.statsRow}>
                                <div className={styles.statCol} style={{ gap: '8px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '10px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                    <div style={{ width: '60px', height: '16px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                </div>
                                <div className={styles.statDivider} />
                                <div className={styles.statCol} style={{ gap: '8px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '10px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                    <div style={{ width: '60px', height: '16px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                </div>
                                <div className={styles.statDivider} />
                                <div className={styles.statCol} style={{ gap: '8px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '10px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                    <div style={{ width: '60px', height: '16px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                            <div className={styles.progressSection}>
                                <div className={styles.progressBarTrack}></div>
                                <div className={styles.progressLabelRow}>
                                    <div style={{ width: '50px', height: '10px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                    <div style={{ width: '80px', height: '10px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                            <div className={styles.cardActionsRow}>
                                <div style={{ flex: 1, height: '36px', background: '#E2E8F0', borderRadius: '8px' }}></div>
                                <div style={{ flex: 1, height: '36px', background: '#E2E8F0', borderRadius: '8px' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : advances.length === 0 ? (
                <div className={styles.emptyState}>No advance accounts found matching filters.</div>
            ) : (
                <div className={styles.cardsGrid}>
                    {advances.map(adv => {
                        const safeTotal = adv.totalAmount || 0;
                        const safeRepaid = adv.amountRepaid || 0;
                        const safeRemaining = adv.remainingBalance || 0;
                        const safeName = adv.employeeName || 'Unknown';
                        
                        const ratio = safeTotal > 0 ? (safeRepaid / safeTotal) : 0;
                        const pct = Math.min(100, Math.round(ratio * 100));
                        const isCompleted = adv.status === 'completed';

                        return (
                            <div key={adv.id} className={`${styles.advanceCard} ${isCompleted ? styles.advanceCardCompleted : ''}`}>
                                {/* Header */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.employeeCell}>
                                        <div className={styles.avatar}>
                                            {safeName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={styles.nameSection}>
                                            <span className={styles.employeeName}>{safeName}</span>
                                            <span className={styles.employeeRole}>{getRoleLabel(adv.role)}</span>
                                        </div>
                                    </div>
                                    <span className={`${styles.badge} ${isCompleted ? styles.badgeCompleted : styles.badgeActive}`}>
                                        {isCompleted ? 'Fully Repaid' : 'Active'}
                                    </span>
                                </div>

                                {/* Three Column Stats */}
                                <div className={styles.statsRow}>
                                    <div className={styles.statCol}>
                                        <div className={styles.statLabel}>Borrowed</div>
                                        <div className={styles.statValue}>₹{safeTotal.toLocaleString('en-IN')}</div>
                                        {adv.topUps && adv.topUps.length > 0 && (
                                            <div className={styles.statSubText}>{adv.topUps.length + 1} advances combined</div>
                                        )}
                                    </div>
                                    <div className={styles.statDivider} />
                                    <div className={styles.statCol}>
                                        <div className={styles.statLabel}>Paid</div>
                                        <div className={`${styles.statValue} ${styles.valGreen}`}>₹{safeRepaid.toLocaleString('en-IN')}</div>
                                    </div>
                                    <div className={styles.statDivider} />
                                    <div className={styles.statCol}>
                                        <div className={styles.statLabel}>Remaining</div>
                                        <div className={`${styles.statValue} ${isCompleted ? styles.valGray : styles.valRed}`}>
                                            ₹{safeRemaining.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Section */}
                                <div className={styles.progressSection}>
                                    <div className={styles.progressBarTrack}>
                                        <div
                                            className={`${styles.progressBarFill} ${isCompleted ? styles.progressGreen : ''}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className={styles.progressLabelRow}>
                                        <span>{pct}% repaid</span>
                                        <span>₹{safeRemaining.toLocaleString('en-IN')} remaining</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className={styles.cardActionsRow}>
                                    {!isCompleted && (
                                        <button
                                            className={styles.btnActionPrimary}
                                            onClick={() => {
                                                setActiveFormAdvanceId(adv.id);
                                                setInlineData({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
                                                setInlineErrors({});
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                                <line x1="2" y1="10" x2="22" y2="10" />
                                            </svg>
                                            Pay
                                        </button>
                                    )}
                                    <button
                                        className={styles.btnActionSecondary}
                                        onClick={() => setExpandedHistoryId(expandedHistoryId === adv.id ? null : adv.id)}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        History
                                    </button>
                                    <button className={styles.btnActionIcon} title="Download Statement">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Inline Form (Slides down below buttons if active) */}
                                {activeFormAdvanceId === adv.id && !isCompleted && (
                                    <div className={styles.inlineForm}>
                                        <div className={styles.inlineFormTitle}>Record Instalment Recovery</div>
                                        <div className={styles.inlineFormRow}>
                                            <div style={{ width: '40%' }}>
                                                <input
                                                    type="number"
                                                    className={`${styles.inlineInput} ${inlineErrors.amount ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                                    style={{ width: '100%' }}
                                                    placeholder="Amount ₹"
                                                    value={inlineData.amount}
                                                    min="1"
                                                    onChange={(e) => { setInlineData(prev => ({ ...prev, amount: e.target.value })); setInlineErrors(prev => ({...prev, amount: ''})); }}
                                                />
                                            </div>
                                            <div style={{ width: '60%' }}>
                                                <input
                                                    type="date"
                                                    className={`${styles.inlineInput} ${inlineErrors.date ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                                    style={{ width: '100%' }}
                                                    value={inlineData.date}
                                                    onChange={(e) => { setInlineData(prev => ({ ...prev, date: e.target.value })); setInlineErrors(prev => ({...prev, date: ''})); }}
                                                />
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className={styles.inlineInput}
                                            placeholder="Short note (e.g. Month deductions)"
                                            value={inlineData.note}
                                            onChange={(e) => setInlineData(prev => ({ ...prev, note: e.target.value }))}
                                        />
                                        <div className={styles.inlineActions}>
                                            <button className={styles.btnCancelInline} onClick={() => setActiveFormAdvanceId(null)}>Cancel</button>
                                            <button className={styles.btnSubmitInline} onClick={() => handleAddInstalment(adv.id)}>Add</button>
                                        </div>
                                    </div>
                                )}

                                {/* History Drawer */}
                                <div className={`${styles.historyDrawer} ${expandedHistoryId === adv.id ? styles.historyDrawerOpen : ''}`}>
                                    <div className={styles.sectionTitle}>Transaction History</div>
                                    {(() => {
                                        const topUpEvents = (adv.topUps || []).map((t: any) => ({
                                            type: 'topup' as const,
                                            date: t.date,
                                            amount: t.amount,
                                            note: t.note,
                                            timestamp: new Date(t.date).getTime()
                                        }));

                                        const repaymentEvents = (adv.instalments || []).map((ins: any) => ({
                                            type: 'repayment' as const,
                                            date: ins.date,
                                            amount: ins.amount,
                                            note: ins.note,
                                            timestamp: new Date(ins.date).getTime()
                                        }));

                                        const allEvents = [...topUpEvents, ...repaymentEvents].sort((a, b) => b.timestamp - a.timestamp);

                                        if (allEvents.length === 0) {
                                            return (
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px' }}>
                                                    No transaction history recorded yet.
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className={styles.historyList}>
                                                {allEvents.map((evt, idx) => {
                                                    const isTopup = evt.type === 'topup';
                                                    const safeEvtAmount = evt.amount || 0;
                                                    const formattedAmount = `${isTopup ? '+' : '-'} ₹${safeEvtAmount.toLocaleString('en-IN')}`;
                                                    const formattedDate = formatDateString(evt.date);
                                                    const badgeLabel = isTopup ? 'Top-up' : 'Repayment';

                                                    return (
                                                        <div key={idx} className={styles.historyRow}>
                                                            <span className={`${styles.historyBadge} ${isTopup ? styles.badgeTopup : styles.badgeRepayment}`}>
                                                                {badgeLabel}
                                                            </span>
                                                            <span className={styles.historyText}>
                                                                <strong className={isTopup ? styles.textGreen : styles.textRed}>{formattedAmount}</strong>
                                                                <span className={styles.historyDetails}>
                                                                    {isTopup 
                                                                        ? ` — Top-up on ${formattedDate}${evt.note ? ` — ${evt.note}` : ''}`
                                                                        : ` — ${evt.note || 'Repayment'} — ${formattedDate}`
                                                                    }
                                                                </span>
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* "+ New Advance" Pop-up Modal */}
            {isModalOpen && (() => {
                const selectedEmployeeId = modalData.employeeId;
                const activeAdvance = selectedEmployeeId 
                    ? advances.find(a => a.employeeId === parseInt(selectedEmployeeId) && a.status === 'active')
                    : null;

                return (
                    <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                {activeAdvance ? 'Add to Existing Advance' : 'New Advance'}
                            </div>
                            <form onSubmit={handleCreateAdvance}>
                                {activeAdvance && (
                                    <div className={styles.infoBanner}>
                                        ⚠ Active advance exists: ₹{activeAdvance.remainingBalance.toLocaleString('en-IN')} remaining from previous advance of ₹{activeAdvance.totalAmount.toLocaleString('en-IN')}
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label>Employee</label>
                                    <select
                                        className={`${styles.modalSelect} ${modalErrors.employeeId ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                        value={modalData.employeeId}
                                        onChange={(e) => { setModalData(prev => ({ ...prev, employeeId: e.target.value })); setModalErrors(prev => ({...prev, employeeId: ''})); }}
                                        data-error={!!modalErrors.employeeId}
                                    >
                                        <option value="">Select Employee...</option>
                                        {activeEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({getRoleLabel(emp.role)})</option>
                                        ))}
                                    </select>
                                    {modalErrors.employeeId && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{modalErrors.employeeId}</p>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Advance Amount (₹)</label>
                                    <input
                                        type="number"
                                        className={`${styles.modalInput} ${modalErrors.totalAmount ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                        min="1"
                                        placeholder="e.g. 50000"
                                        value={modalData.totalAmount}
                                        onChange={(e) => { setModalData(prev => ({ ...prev, totalAmount: e.target.value })); setModalErrors(prev => ({...prev, totalAmount: ''})); }}
                                        data-error={!!modalErrors.totalAmount}
                                    />
                                    {modalErrors.totalAmount && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{modalErrors.totalAmount}</p>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Date Given</label>
                                    <input
                                        type="date"
                                        className={`${styles.modalInput} ${modalErrors.date ? '!border-red-400 focus:!ring-red-500 !bg-red-50/30' : ''}`}
                                        value={modalData.date}
                                        onChange={(e) => { setModalData(prev => ({ ...prev, date: e.target.value })); setModalErrors(prev => ({...prev, date: ''})); }}
                                        data-error={!!modalErrors.date}
                                    />
                                    {modalErrors.date && <p className="text-red-500 text-xs mt-1 transition-all duration-200">{modalErrors.date}</p>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Note / Remarks (Optional)</label>
                                    <input
                                        type="text"
                                        className={styles.modalInput}
                                        placeholder="e.g. Festival advance, interest-free"
                                        value={modalData.note}
                                        onChange={(e) => setModalData(prev => ({ ...prev, note: e.target.value }))}
                                    />
                                </div>

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className={styles.btnSubmit}>
                                        {activeAdvance ? 'Add to Existing Advance' : 'Create Advance'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
