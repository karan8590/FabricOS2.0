const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/vendor-payments/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix 1: Force dynamic balance calculation instead of cached v.balance
code = code.replace(
    /balance: v\.balance \|\| 0,/g,
    'balance: 0,'
);

// Fix 2: Empty state for vendor card detail expansion
const searchEmptyTable = `{renderTable(g.payments)}`;
const replaceEmptyTable = `{g.payments.length === 0 ? (
                                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                        <p style={{ margin: 0, fontWeight: 500 }}>No active vendor payments</p>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Outstanding balance is zero.</p>
                                                    </div>
                                                ) : (
                                                    renderTable(g.payments)
                                                )}`;
code = code.replace(searchEmptyTable, replaceEmptyTable);

fs.writeFileSync(file, code);
