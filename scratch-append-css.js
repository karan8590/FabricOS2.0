const fs = require('fs');
const cssFile = '/Users/karandhameliya/Desktop/ag/FabricOS/app/telegram-center/TelegramCenter.module.css';
const newCss = `
/* --- WIZARD REDESIGN CSS --- */

/* Header Progress Bar */
.progressContainer {
    width: 100%;
    margin-top: 16px;
}
.progressTrack {
    width: 100%;
    height: 6px;
    background: var(--border-primary);
    border-radius: 3px;
    overflow: hidden;
}
.progressFill {
    height: 100%;
    background: var(--accent);
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.progressLabel {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 8px;
    display: block;
}

/* Wizard Steps Layout */
.wizardContainer {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    max-width: 800px;
    margin: 0 auto;
}

.stepWrapper {
    display: flex;
    gap: 20px;
    position: relative;
}

.stepConnectorWrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24px;
    flex-shrink: 0;
}

.stepCircle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    z-index: 2;
    transition: all 0.3s ease;
}

.stepLine {
    flex: 1;
    width: 2px;
    background: var(--border-primary);
    margin: 4px 0;
    transition: background 0.3s ease;
}

.stepLineActive {
    background: #10B981;
}

/* Step Card States */
.stepCard {
    flex: 1;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    transition: all 0.3s ease;
}

.stepCardCompleted {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
}
.stepCardCompleted .stepCircle {
    background: #10B981;
    color: #fff;
}
.stepCardCompleted h3 {
    color: #166534;
}

.stepCardActive {
    background: var(--bg-card);
    border: 1.5px solid var(--accent);
    box-shadow: var(--shadow-md);
}
.stepCardActive .stepCircle {
    background: var(--accent);
    color: #fff;
}

.stepCardPending {
    background: var(--bg-grouped);
    border: 1px solid var(--border-primary);
    opacity: 0.7;
}
.stepCardPending .stepCircle {
    background: var(--bg-grouped);
    border: 1px solid var(--border-primary);
    color: var(--text-secondary);
}

.stepHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}
.stepHeader h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.stepBadge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.badgeCompleted { background: #DCFCE7; color: #166534; }
.badgeCurrent { background: #EEF2FF; color: var(--accent); }
.badgePending { background: #F3F4F6; color: #4B5563; }

.stepContent {
    margin-top: 16px;
    font-size: 14px;
    color: var(--text-secondary);
}

/* Code instruction box */
.codeBox {
    background: #1E1E1E;
    color: #D4D4D4;
    padding: 16px;
    border-radius: 8px;
    font-family: monospace;
    margin: 16px 0;
    white-space: pre-wrap;
    font-size: 13px;
}

/* Dashboard Tabs */
.tabsContainer {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--border-primary);
    margin-bottom: 24px;
    overflow-x: auto;
}
.tabButton {
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}
.tabButton:hover {
    color: var(--text-primary);
}
.tabButtonActive {
    color: var(--accent);
    border-bottom-color: var(--accent);
}

.tabContent {
    animation: fadeIn 0.3s ease;
}
`;

fs.appendFileSync(cssFile, newCss);
console.log('Appended CSS successfully.');
