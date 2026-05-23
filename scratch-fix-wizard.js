const fs = require('fs');

const cssFile = '/Users/karandhameliya/Desktop/ag/FabricOS/app/telegram-center/TelegramCenter.module.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');

// Update CSS for layout and spacing
cssContent = cssContent.replace('.wizardContainer {\n    display: flex;\n    flex-direction: column;\n    gap: 0;\n    position: relative;\n    max-width: 800px;\n    margin: 0 auto;\n}', 
`.wizardContainer {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    max-width: 780px;
    margin: 0 auto;
}`);

// Fix StepWrapper to use flex-start and gap 16px
cssContent = cssContent.replace('.stepWrapper {\n    display: flex;\n    gap: 20px;\n    position: relative;\n}', 
`.stepWrapper {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    position: relative;
}`);

// Step Connector Wrapper fixed width
cssContent = cssContent.replace('.stepConnectorWrapper {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    width: 24px;\n    flex-shrink: 0;\n}', 
`.stepConnectorWrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 40px;
    flex-shrink: 0;
    position: relative;
}`);

// Step Circle sizes (32px instead of 24px)
cssContent = cssContent.replace('.stepCircle {\n    width: 24px;\n    height: 24px;', 
`.stepCircle {
    width: 32px;
    height: 32px;`);

// Connector line absolute positioned
cssContent = cssContent.replace('.stepLine {\n    flex: 1;\n    width: 2px;\n    background: var(--border-primary);\n    margin: 4px 0;\n    transition: background 0.3s ease;\n}', 
`.stepLine {
    position: absolute;
    top: 36px;
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    background: var(--border-default);
    transition: background 0.3s ease;
}`);

cssContent = cssContent.replace('.stepLineActive {\n    background: #10B981;\n}', 
`.stepLineActive {
    background: #16A34A;
}`);

// Card spacing fixes
cssContent = cssContent.replace('.stepCard {\n    flex: 1;\n    border-radius: 12px;\n    padding: 20px;\n    margin-bottom: 24px;\n    transition: all 0.3s ease;\n}', 
`.stepCard {
    flex: 1;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 12px;
    transition: all 0.3s ease;
    width: 100%;
}`);

// Font adjustments
cssContent = cssContent.replace('.stepHeader h3 {\n    margin: 0;\n    font-size: 16px;\n    font-weight: 600;\n}', 
`.stepHeader h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
}`);

cssContent = cssContent.replace('.stepContent {\n    margin-top: 16px;\n    font-size: 14px;\n    color: var(--text-secondary);\n}', 
`.stepContent {
    margin-top: 16px;
    font-size: 13px;
    color: var(--text-secondary);
}`);

// Write CSS
fs.writeFileSync(cssFile, cssContent);

// NOW REWRITE SetupWizard.tsx
const wizardFile = '/Users/karandhameliya/Desktop/ag/FabricOS/components/telegram/SetupWizard.tsx';

const newWizardContent = `import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
    const [sendingTest, setSendingTest] = useState(false);
    const [testError, setTestError] = useState('');
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
        // Step 2 just saves the chat ID and moves to Step 3
        saveWizardState({ step: 3, chatId });
        setWizardStep(3);
        setVerifyingChatId(false);
    };

    const handleSendTestMessage = async () => {
        setSendingTest(true);
        setTestError('');
        try {
            const res = await fetch('/api/settings/telegram/test-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId })
            });
            const data = await res.json();
            if (!data.success) {
                setTestError(data.error || 'Failed to send message.');
            } else {
                setTestReceived(null);
            }
        } catch (e) {
            setTestError('Network error connecting to server.');
        }
        setSendingTest(false);
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
                        background: isCompleted ? '#16A34A' : isActive ? 'var(--accent)' : 'var(--bg-subtle)',
                        color: isCompleted || isActive ? '#fff' : 'var(--text-secondary)',
                        border: isPending ? '1.5px solid var(--border-default)' : 'none',
                        fontWeight: isActive ? 600 : 'normal',
                        fontSize: isActive ? '14px' : '12px'
                    }}>
                        {isCompleted ? <i className="ti ti-check" style={{ fontSize: '16px' }} /> : stepNumber}
                    </div>
                    {stepNumber < 7 && (
                        <div className={\`\${styles.stepLine} \${isCompleted ? styles.stepLineActive : ''}\`} />
                    )}
                </div>

                <div className={\`\${styles.stepCard} \${
                    isCompleted ? styles.stepCardCompleted : 
                    isActive ? styles.stepCardActive : styles.stepCardPending
                }\`}>
                    <div className={styles.stepHeader}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Step {stepNumber} — {title}
                        </h3>
                        {isCompleted && <span className={\`\${styles.stepBadge} \${styles.badgeCompleted}\`}><i className="ti ti-circle-check" style={{ fontSize: '12px' }}/> Completed</span>}
                        {isActive && <span className={\`\${styles.stepBadge} \${styles.badgeCurrent}\`}><i className="ti ti-point-filled" style={{ fontSize: '12px' }}/> Current</span>}
                        {isPending && <span className={\`\${styles.stepBadge} \${styles.badgePending}\`}><i className="ti ti-clock" style={{ fontSize: '12px' }}/> Pending</span>}
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
                <div style={{ marginTop: '14px' }}>
                    <button 
                        className="action-btn-primary"
                        onClick={props.onValidateBot}
                        disabled={props.validatingBot || !props.botToken}
                    >
                        {props.validatingBot ? <><Loader2 size={16} className="animate-spin" /> Validating...</> : 'Validate Bot'}
                    </button>
                </div>
            </StepRow>

            {/* STEP 2: Get Your Chat ID */}
            <StepRow stepNumber={2} title="Get Your Chat ID" status={getStatus(2)} onEdit={() => setWizardStep(2)}>
                <p>1. Open Telegram and search for your bot.</p>
                <p>2. Send the message /start to your bot.</p>
                <p>3. Your Chat ID will appear — paste it below.</p>
                
                <div className={styles.codeBox}>
                    Send this to your bot in Telegram:
                    
                    /start
                </div>

                <input 
                    type="text" 
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className={styles.formInput}
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                    <button 
                        className="action-btn-primary"
                        onClick={handleVerifyChatId}
                        disabled={!chatId}
                    >
                        Continue →
                    </button>
                    <button className="action-btn-secondary" onClick={() => setWizardStep(3)}>
                        Skip for now
                    </button>
                </div>
            </StepRow>

            {/* STEP 3: Send Test Message */}
            <StepRow stepNumber={3} title="Send Test Message" status={getStatus(3)} onEdit={() => setWizardStep(3)}>
                <p style={{ color: '#D97706', marginBottom: '16px' }}>
                    <i className="ti ti-alert-triangle" /> <b>Important:</b> You must first open Telegram, find your bot, and send it the message /start — otherwise the bot cannot reach you.
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <button className="action-btn-secondary" onClick={handleSendTestMessage} disabled={sendingTest}>
                        {sendingTest ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : (testError ? 'Resend test message' : 'Send Test Message')}
                    </button>
                </div>

                {testError && (
                    <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
                        Failed: {testError}. Make sure you sent /start to your bot first.
                    </div>
                )}

                {!testError && testReceived === null && !sendingTest && (
                    <p>We just sent a test message to your Telegram. Did you receive it?</p>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button 
                        onClick={() => handleTestReceived(true)} 
                        style={{
                            height: '36px', padding: '0 16px', border: '1.5px solid #16A34A', color: '#16A34A', background: '#F0FDF4', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#DCFCE7'}
                        onMouseOut={e => e.currentTarget.style.background = '#F0FDF4'}
                    >
                        <i className="ti ti-check" style={{ fontSize: '14px' }} /> Yes, I received it
                    </button>
                    <button 
                        onClick={() => handleTestReceived(false)} 
                        style={{
                            height: '36px', padding: '0 16px', border: '1.5px solid #DC2626', color: '#DC2626', background: '#FEF2F2', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#FFEBEE'}
                        onMouseOut={e => e.currentTarget.style.background = '#FEF2F2'}
                    >
                        <i className="ti ti-refresh" style={{ fontSize: '14px' }} /> No, try again
                    </button>
                </div>
            </StepRow>

            {/* STEP 4: Configure Daily Reminders */}
            <StepRow stepNumber={4} title="Configure Daily Reminders" status={getStatus(4)} onEdit={() => setWizardStep(4)}>
                <label className="switch-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <input type="checkbox" checked={dailySummary} onChange={e => setDailySummary(e.target.checked)} className={styles.checkboxInput} />
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Enable daily business summary at 9:00 AM IST</span>
                </label>

                {dailySummary && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontFamily: 'monospace', fontSize: '13px' }}>
                        <i className="ti ti-chart-bar" style={{ color: 'var(--text-secondary)' }} /> <b>FabricOS — Daily Summary</b><br/>
                        {new Date().toLocaleDateString()}<br/>
                        - New orders: 12<br/>
                        - Dispatched: 8<br/>
                        - Unpaid invoices: <i className="ti ti-currency-rupee" style={{ color: 'var(--text-secondary)' }} />45,000<br/>
                        - Overdue: 3
                    </div>
                )}

                <div style={{ marginTop: '14px' }}>
                    <button className="action-btn-primary" onClick={() => { setWizardStep(5); saveWizardState({ step: 5 }); }}>
                        Save & Continue
                    </button>
                </div>
            </StepRow>

            {/* STEP 5: Set Up Payment Reminders */}
            <StepRow stepNumber={5} title="Set Up Payment Reminders" status={getStatus(5)} onEdit={() => setWizardStep(5)}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <input type="checkbox" checked={paymentAlerts} onChange={e => setPaymentAlerts(e.target.checked)} />
                    <span style={{ fontWeight: 500 }}>Alert me when invoices are due</span>
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
                    <span style={{ fontWeight: 500 }}>Alert me when vendor payments are due</span>
                </label>

                <div style={{ marginTop: '14px' }}>
                    <button className="action-btn-primary" onClick={() => { setWizardStep(6); saveWizardState({ step: 6 }); }}>
                        Save & Continue
                    </button>
                </div>
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
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Note: Set minimum stock levels in Inventory → Printing Ink tab.</p>
                <div style={{ marginTop: '14px' }}>
                    <button className="action-btn-primary" onClick={() => { setWizardStep(7); saveWizardState({ step: 7 }); }}>
                        Save & Continue
                    </button>
                </div>
            </StepRow>

            {/* STEP 7: Final Review */}
            <StepRow stepNumber={7} title="Final Review" status={getStatus(7)} onEdit={() => {}}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Configuration Summary</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                        <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><i className="ti ti-circle-check" style={{ color: '#16A34A' }} /> <b>Bot:</b> Connected</li>
                        <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><i className="ti ti-circle-check" style={{ color: '#16A34A' }} /> <b>Chat ID:</b> {chatId || 'Configured'}</li>
                        <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><i className="ti ti-circle-check" style={{ color: '#16A34A' }} /> <b>Daily summary:</b> {dailySummary ? '9:00 AM IST' : 'Disabled'}</li>
                        <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><i className="ti ti-circle-check" style={{ color: '#16A34A' }} /> <b>Payment reminders:</b> {paymentAlerts ? 'Enabled' : 'Disabled'}</li>
                        <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><i className="ti ti-circle-check" style={{ color: '#16A34A' }} /> <b>Stock alerts:</b> {stockInk || stockPack ? 'Enabled' : 'Disabled'}</li>
                    </ul>
                </div>

                <div style={{ marginTop: '14px' }}>
                    <button 
                        className="action-btn-primary" 
                        onClick={handleFinalActivate}
                        disabled={props.activating}
                        style={{ width: '100%', height: '54px', fontSize: '18px', background: 'var(--accent)' }}
                    >
                        {props.activating ? <><Loader2 className="animate-spin" /> Activating...</> : <><i className="ti ti-confetti" style={{ color: '#fff' }} /> Activate Telegram Automation</>}
                    </button>
                </div>
            </StepRow>
        </div>
    );
}
`;

fs.writeFileSync(wizardFile, newWizardContent);
console.log('SetupWizard updated successfully');
