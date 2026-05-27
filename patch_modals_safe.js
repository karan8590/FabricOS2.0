const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components', 'catalog');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Ensure hydration fix exists
    content = content.replace(/if \(typeof window === 'undefined'\) return null;/g, 'const [mounted, setMounted] = useState(false);\n    useEffect(() => { setMounted(true); }, []);\n\n    if (!mounted) return null;');

    // 2. Ensure useEffect is imported if missing
    if (!content.includes('import React, { useState, useEffect }')) {
        content = content.replace(/import React, \{ useState(?:, useRef)? \} from 'react';/, "import React, { useState, useRef, useEffect } from 'react';");
        content = content.replace(/import React, \{ useState(?:, useCallback)? \} from 'react';/, "import React, { useState, useCallback, useEffect } from 'react';");
    }

    // 3. Patch overlay animation
    content = content.replace(
        /className=\{styles\.overlay\}\s*\n\s*initial=\{\{ opacity: 0 \}\} animate=\{\{ opacity: 1 \}\} exit=\{\{ opacity: 0 \}\}/g,
        "className={styles.overlay} \n                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}\n                    initial={{ opacity: 0 }}\n                    animate={{ opacity: 1 }}\n                    exit={{ opacity: 0 }}\n                    transition={{ duration: 0.15 }}"
    );

    // 4. Patch modal content animation
    content = content.replace(
        /initial=\{\{ opacity: 0, scale: [0-9.]+, y: [0-9]+ \}\}\s*\n\s*animate=\{\{ opacity: 1, scale: [0-9.]+, y: 0 \}\}\s*\n\s*exit=\{\{ opacity: 0, scale: [0-9.]+, y: [0-9]+ \}\}\s*\n\s*transition=\{\{.*\}\}/g,
        "initial={{ opacity: 0, y: 6 }}\n                        animate={{ opacity: 1, y: 0 }}\n                        exit={{ opacity: 0, y: 4 }}\n                        transition={{ duration: 0.15 }}"
    );
    
    // Also cover the case where scale is just "scale: 1" etc
    content = content.replace(
        /initial=\{\{ scale: [0-9.]+, opacity: 0, y: [0-9]+ \}\}\s*\n\s*animate=\{\{ scale: 1, opacity: 1, y: 0 \}\}\s*\n\s*exit=\{\{ scale: [0-9.]+, opacity: 0, y: [0-9]+ \}\}\s*\n\s*transition=\{\{.*\}\}/g,
        "initial={{ opacity: 0, y: 6 }}\n                        animate={{ opacity: 1, y: 0 }}\n                        exit={{ opacity: 0, y: 4 }}\n                        transition={{ duration: 0.15 }}"
    );

    // 5. Change <AnimatePresence> to <AnimatePresence initial={false}>
    content = content.replace(/<AnimatePresence>/g, '<AnimatePresence initial={false}>');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched safely ${file}`);
}
