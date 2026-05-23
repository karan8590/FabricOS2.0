import React, { useState } from 'react';
import { CheckCircle2, Circle, Edit2, PlayCircle, Shield, ArrowRight, Bell, Package, Check, Loader2 } from 'lucide-react';
import styles from '@/app/telegram-center/TelegramCenter.module.css';
import confetti from 'canvas-confetti';

interface SetupWizardProps {
    currentStep: number;
    setWizardStep: (step: number) => void;
    saveWizardState: (updates: any) => Promise<void>;
    botToken: string;
    setBotToken: (val: string) => void;
    onValidateBot: () => void;
    validatingBot: boolean;
    botValid: boolean;
    onActivate: () => void;
    activating: boolean;
}

export function SetupWizard(props: SetupWizardProps) {
    const { currentStep, setWizardStep, saveWizardState } = props;

    // Local State for Steps
    const [chatId, setChatId] = useState('');
    const [verifyingChatId, setVerifyingChatId] = useState(false);
    const [chatIdValid, setChatIdValid] = useState(false);
    const [testReceived, setTestReceived] = useState<boolean | null>(null);

    // Configuration Toggles
    const [dailySummary, setDailySummary] = useState(true);
    
    const [paymentAlerts, setPaymentAlerts] = useState(true);
    const [paySubBefore, setPaySubBefore] = useState(true);
    const [paySubOn, setPaySubOn] = useState(true);
    const [paySubOverdue, setPaySubOverdue] = useState(true);

    const [stockInk, setStockInk] = useState(true);
    const [stockPack, setStockPack] = useState(true);

    const handleVerifyChatId = async () => {
        setVerifyingChatId(true);
        // Simulate API call to verify Chat ID
        await new Promise(r => setTimeout(r, 1000));
        setChatIdValid(true);
        setVerifyingChatId(false);
        saveWizardState({ step: 3, chatId });
        setWizardStep(3);
    };

    const handleTestReceived = (received: boolean) => {
        setTestReceived(received);
        if (received) {
            saveWizardState({ step: 4 });
            setWizardStep(4);
        }
    };

    const triggerConfetti = () => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    };

    const handleFinalActivate = async () => {
        triggerConfetti();
        await props.saveWizardState({ 
            chatId, 
            dailySummary, 
            paymentAlerts: paymentAlerts ? { before: paySubBefore, on: paySubOn, overdue: paySubOverdue } : false,
            stockAlerts: { ink: stockInk, pack: stockPack }
        });
        props.onActivate();
    };

    // Helper to render the Step Wrapper with Connector
    const StepRow = ({ stepNumber, title, status, children, onEdit }: any) => {
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isPending = status === 'pending';

        return (
            <div className={styles.stepWrapper}>
                <div className={styles.stepConnectorWrapper}>
                    <div className={styles.stepCircle} style={{
                        background: isCompleted ? '#10B981' : isActive ? 'var(--accent)' : 'var(--bg-grouped)',
                        color: isCompleted || isActive ? '#fff' : 'var(--text-secondary)',
                        border: isPending ? '1px solid var(--border-primary)' : 'none'
                    }}>
                        {isCompleted ? <Check size={14} /> : stepNumber}
                    </div>
                    {stepNumber < 7 && (
                        <div className={`${styles.stepLine} ${isCompleted ? styles.stepLineActive : ''}`} />
                    )}
                </div>

                <div className={`${styles.stepCard} ${
                    isCompleted ? styles.stepCardCompleted : 
                    isActive ? styles.stepCardActive : styles.stepCardPending
                }`}>
                    <div className={styles.stepHeader}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isCompleted && '✅'}
                            {isActive && '🔵'}
                            {isPending && '⬜'}
                            Step {stepNumber} — {title}
                        </h3>
                        {isCompleted && <span className={`${styles.stepBadge} ${styles.badgeCompleted}`}>COMPLETED</span>}
                        {isActive && <span className={`${styles.stepBadge} ${styles.badgeCurrent}`}>← CURRENT</span>}
                        {isPending && <span className={`${styles.stepBadge} ${styles.badgePending}`}>PENDING</span>}
                    </div>
                    
                    {isCompleted && (
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', color: '#166534' }}>Configured successfully.</div>
                            <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                                Edit
                            </button>
                        </div>
                    )}

                    {isActive && (
                        <div className={styles.stepContent}>
                            {children}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getStatus = (step: number) => {
        if (currentStep > step) return 'completed';
        if (currentStep === step) return 'active';
        return 'pending';
    };

    return (
        <div className={styles.wizardContainer}>
            {/* STEP 1: Connect Telegram Bot */}
            <StepRow stepNumber={1} title="Connect Telegram Bot" status={getStatus(1)} onEdit={() => setWizardStep(1)}>
                <p>Go to @BotFather on Telegram → /newbot → copy the Bot Token</p>
                <input 
                    type="text" 
                    value={props.botToken}
                    onChange={(e) => props.setBotToken(e.target.value)}
                    placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                    className={styles.formInput}
                    style={{ borderColor: props.botValid === false && props.botToken ? '#EF4444' : undefined }}
                />
                <button 
                    className="action-btn-primary"
                    onClick={props.onValidateBot}
                    disabled={props.validatingBot || !props.botToken}
                >
                    {props.validatingBot ? <><Loader2 size={16} className="animate-spin" /> Validating...</> : 'Validate Bot'}
                </button>
            </StepRow>

            {/* STEP 2: Get Your Chat ID */}
            <StepRow stepNumber={2} title="Get Your Chat ID" status={getStatus(2)} onEdit={() => setWizardStep(2)}>
                <p>1. Open Telegram and search for your bot: @FabricOSBot</p>
                <p>2. Send the message /start to your bot</p>
                <p>3. Your Chat ID will appear — paste it below</p>
                
                <div className={styles.codeBox}>
                    Send this to your bot in Telegram:<br/><br/>
                    /start
                </div>

                <input 
                    type="text" 
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className={styles.formInput}
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button 
                        className="action-btn-primary"
                        onClick={handleVerifyChatId}
                        disabled={verifyingChatId || !chatId}
                    >
                        {verifyingChatId ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : 'Verify Chat ID'}
                    </button>
                    <button className="action-btn-secondary" onClick={() => setWizardStep(3)}>
                        Skip for now
                    </button>
                </div>
            </StepRow>

            {/* STEP 3: Send Test Message */}
            <StepRow stepNumber={3} title="Send Test Message" status={getStatus(3)} onEdit={() => setWizardStep(3)}>
                <p>We just sent a test message to your Telegram. Did you receive it?</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button className="action-btn-primary" onClick={() => handleTestReceived(true)} style={{ background: '#10B981', borderColor: '#059669' }}>
                        ✅ Yes, I received it
                    </button>
                    <button className="action-btn-secondary" onClick={() => handleTestReceived(false)} style={{ color: '#EF4444', borderColor: '#FCA5A5', background: '#FEF2F2' }}>
                        ❌ No, try again
                    </button>
                </div>
                {testReceived === false && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
                        Ensure you started the conversation with the bot and entered the correct Chat ID in Step 2.
                    </div>
                )}
            </StepRow>

            {/* STEP 4: Configure Daily Reminders */}
            <StepRow stepNumber={4} title="Configure Daily Reminders" status={getStatus(4)} onEdit={() => setWizardStep(4)}>
                <label className="switch-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <input type="checkbox" checked={dailySummary} onChange={e => setDailySummary(e.target.checked)} className={styles.checkboxInput} />
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Enable daily business summary at 9:00 AM IST</span>
                </label>

                {dailySummary && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontFamily: 'monospace', fontSize: '13px' }}>
                        📊 <b>FabricOS — Daily Summary</b><br/>
                        {new Date().toLocaleDateString()}<br/>
                        - New orders: 12<br/>
                        - Dispatched: 8<br/>
                        - Unpaid invoices: ₹45,000<br/>
                        - Overdue: 3
                    </div>
                )}

                <button className="action-btn-primary" onClick={() => { setWizardStep(5); saveWizardState({ step: 5 }); }}>
                    Save & Continue
                </button>
            </StepRow>

            {/* STEP 5: Set Up Payment Reminders */}
            <StepRow stepNumber={5} title="Set Up Payment Reminders" status={getStatus(5)} onEdit={() => setWizardStep(5)}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <input type="checkbox" checked={paymentAlerts} onChange={e => setPaymentAlerts(e.target.checked)} />
                    <span style={{ fontWeight: 600 }}>Alert me when invoices are due</span>
                </label>

                {paymentAlerts && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '28px', marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={paySubBefore} onChange={e=>setPaySubBefore(e.target.checked)} /> 3 days before due date</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={paySubOn} onChange={e=>setPaySubOn(e.target.checked)} /> On due date</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={paySubOverdue} onChange={e=>setPaySubOverdue(e.target.checked)} /> When overdue</label>
                    </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <input type="checkbox" defaultChecked />
                    <span style={{ fontWeight: 600 }}>Alert me when vendor payments are due</span>
                </label>

                <button className="action-btn-primary" onClick={() => { setWizardStep(6); saveWizardState({ step: 6 }); }}>
                    Save & Continue
                </button>
            </StepRow>

            {/* STEP 6: Set Up Stock Alerts */}
            <StepRow stepNumber={6} title="Set Up Stock Alerts" status={getStatus(6)} onEdit={() => setWizardStep(6)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={stockInk} onChange={e => setStockInk(e.target.checked)} />
                        <span style={{ fontWeight: 500 }}>Alert me when ink stock is low</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={stockPack} onChange={e => setStockPack(e.target.checked)} />
                        <span style={{ fontWeight: 500 }}>Alert me when packaging stock is low</span>
                    </label>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Note: Set minimum stock levels in Inventory → Printing Ink tab.</p>
                <button className="action-btn-primary" onClick={() => { setWizardStep(7); saveWizardState({ step: 7 }); }}>
                    Save & Continue
                </button>
            </StepRow>

            {/* STEP 7: Final Review */}
            <StepRow stepNumber={7} title="Final Review" status={getStatus(7)} onEdit={() => {}}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0' }}>Configuration Summary</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li style={{ display: 'flex', gap: '8px' }}>✅ <b>Bot:</b> Connected</li>
                        <li style={{ display: 'flex', gap: '8px' }}>✅ <b>Chat ID:</b> {chatId || 'Configured'}</li>
                        <li style={{ display: 'flex', gap: '8px' }}>✅ <b>Daily summary:</b> {dailySummary ? '9:00 AM IST' : 'Disabled'}</li>
                        <li style={{ display: 'flex', gap: '8px' }}>✅ <b>Payment reminders:</b> {paymentAlerts ? 'Enabled' : 'Disabled'}</li>
                        <li style={{ display: 'flex', gap: '8px' }}>✅ <b>Stock alerts:</b> {stockInk || stockPack ? 'Enabled' : 'Disabled'}</li>
                    </ul>
                </div>

                <button 
                    className="action-btn-primary" 
                    onClick={handleFinalActivate}
                    disabled={props.activating}
                    style={{ width: '100%', height: '54px', fontSize: '18px', background: 'var(--accent)' }}
                >
                    {props.activating ? <><Loader2 className="animate-spin" /> Activating...</> : '🎉 Activate Telegram Automation'}
                </button>
            </StepRow>
        </div>
    );
}
