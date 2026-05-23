const fs = require('fs');

const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/telegram-center/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('</>)} // END ACTIVATED')) {
    content = content.replace("            {/* Toast Notifications */}", "            </>)} // END ACTIVATED\n\n            {/* Toast Notifications */}");
    
    // Also, we need to hide the old "Right Column: Integration Form" if it exists, but the user is fine since it's now wrapped inside `isActivated`.
    // Wait, the "Right Column" is just `<div className={styles.sidebarColumn}>`.
    // Actually, letting it render inside the activated dashboard is fine.

    fs.writeFileSync(file, content);
    console.log("Successfully closed block");
} else {
    console.log("Already closed");
}
