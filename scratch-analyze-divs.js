const fs = require('fs');

const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/telegram-center/page.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

let openDivs = 0;
let isActivatedBlockStarted = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('!isActivated ? (')) {
        isActivatedBlockStarted = true;
    }
    
    if (isActivatedBlockStarted) {
        const opens = (line.match(/<div/g) || []).length;
        const closes = (line.match(/<\/div>/g) || []).length;
        openDivs += opens - closes;
        if (opens !== closes || openDivs < 0) {
           // console.log(`Line ${i + 1}: ${line} (Open: ${openDivs})`);
        }
    }
    
    if (line.includes('</>)}')) {
        console.log("At </>)}: Open Divs inside block =", openDivs);
        break;
    }
}
