const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/dispatch/CreateDispatchModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const backButtonSearch = `{step > 1 ? <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button> : <div />}`;
const backButtonReplace = `{step > 1 ? <Button variant="secondary" onClick={() => setStep(s => (s === 4 && (type === 'embroidery' || type === 'dyeing')) ? 2 : s - 1)}>Back</Button> : <div />}`;

code = code.replace(backButtonSearch, backButtonReplace);
fs.writeFileSync(file, code);
