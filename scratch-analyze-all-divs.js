const fs = require('fs');

const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/telegram-center/page.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

let openDivs = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ignore return ( and ending ); we only care inside the main JSX
    if (i < 800) continue; // skip imports and state

    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    openDivs += opens - closes;
    
    // Check other unclosed JSX tags
    const openFrag = (line.match(/<>/g) || []).length;
    const closeFrag = (line.match(/<\/>/g) || []).length;
    
    if (opens !== closes || openFrag !== closeFrag) {
       // console.log(`Line ${i + 1}: ${line} (Divs: ${openDivs})`);
    }
}
console.log("Total Open Divs at EOF (should be 0 or 1 for pageContainer before closing):", openDivs);
