const fs = require('fs');

const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/telegram-center/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
if (!content.includes('TelegramDashboard')) {
    content = content.replace("import { AutomationHealthPanel } from '@/components/telegram/AutomationHealthPanel';", 
        "import { TelegramDashboard } from '@/components/telegram/TelegramDashboard';");
}

// 2. Header and Progress Bar
const oldHeaderRegex = /<div className=\{styles\.headerRow\}>[\s\S]*?<\/div>\s*<\/div>/;

const newHeader = `
            {/* Header Row */}
            <div className={styles.headerRow} style={{ borderBottom: isActivated ? '1px solid var(--border-primary)' : 'none', paddingBottom: isActivated ? '20px' : '0' }}>
                <div className={styles.headerInfo}>
                    <h1>Telegram Center</h1>
                    <p>{isActivated ? 'Manage business alerts, reports, recipients, and automated dispatches.' : 'Connect your Telegram bot to enable automation'}</p>
                </div>
                
                {isActivated && (
                    <div className={styles.headerActions}>
                        <button onClick={loadData} disabled={refreshing} className="action-btn-secondary">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            <span>Refresh</span>
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="action-btn-primary">
                            <Plus size={16} />
                            <span>Add Recipient</span>
                        </button>
                    </div>
                )}
            </div>

            {!isActivated && (
                <div className={styles.progressContainer} style={{ marginBottom: '32px' }}>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: \`\${(wizardStep / 7) * 100}%\` }} />
                    </div>
                    <span className={styles.progressLabel}>{wizardStep} of 7 steps completed</span>
                </div>
            )}
`;

content = content.replace(oldHeaderRegex, newHeader.trim());

// 3. Render block
// We need to replace `{!isActivated ? ( <> <SetupProgressHeader... <SetupWizard... </> ) : ( <> <AutomationHealthPanel ... `

const mainSwitchStart = content.indexOf('{/* MAIN WIZARD OR DASHBOARD SWITCH */}');
const endActivated = content.indexOf('</>)}', mainSwitchStart);

if (mainSwitchStart !== -1 && endActivated !== -1) {
    const newSwitch = `
            {/* MAIN WIZARD OR DASHBOARD SWITCH */}
            {!isActivated ? (
                <SetupWizard 
                    currentStep={wizardStep}
                    setWizardStep={setWizardStep}
                    saveWizardState={saveWizardState}
                    botToken={botToken}
                    setBotToken={setBotToken}
                    onValidateBot={handleValidateBot}
                    validatingBot={savingToken}
                    botValid={botValid}
                    onActivate={handleActivate}
                    activating={activating}
                />
            ) : (
                <TelegramDashboard 
                    botValid={botValid}
                    botToken={botToken}
                    webhookActive={webhookActive}
                    recipients={recipients}
                    testLogs={testLogs}
                    onAddRecipient={() => setShowAddModal(true)}
                    onReconfigure={() => { setIsActivated(false); setWizardStep(1); }}
                />
            )}
    `;
    
    content = content.substring(0, mainSwitchStart) + newSwitch.trim() + content.substring(endActivated + 5);
}

fs.writeFileSync(file, content);
console.log('Patched page.tsx successfully');
