const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components', 'catalog');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Check for createPortal
    if (!content.includes('createPortal')) continue;

    // 2. Ensure hydration fix exists
    if (!content.includes('const [mounted, setMounted] = useState(false)')) {
        // Find the component declaration and inject hydration fix
        const componentRegex = /(export default function \w+\([^)]*\)(?:[\s\S]*?\{))/;
        content = content.replace(componentRegex, (match) => {
            return match + `\n    const [mounted, setMounted] = useState(false);\n    useEffect(() => { setMounted(true); }, []);\n\n`;
        });
        
        // Also inject `if (!mounted) return null;` right before `return createPortal` or similar
        content = content.replace(/return\s+(?:createPortal|\()/g, 'if (!mounted) return null;\n\n    return $&');
        
        // Make sure useEffect is imported
        if (!content.includes('useEffect')) {
            content = content.replace(/import React(?:, {[^}]*})? from 'react';/, "import React, { useState, useEffect } from 'react';");
        }
    }

    // 3. Patch overlay animation
    content = content.replace(
        /className=\{styles\.overlay\}([\s\S]*?)initial=\{[\s\S]*?animate=\{[\s\S]*?exit=\{[\s\S]*?transition=\{[\s\S]*?\}/g,
        `className={styles.overlay} $1 style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}\n                    initial={{ opacity: 0 }}\n                    animate={{ opacity: 1 }}\n                    exit={{ opacity: 0 }}\n                    transition={{ duration: 0.15 }}`
    );

    // 4. Patch modal content animation
    content = content.replace(
        /className=\{styles\.(?:modal|formModal|content|modalContent)\}([\s\S]*?)initial=\{[\s\S]*?animate=\{[\s\S]*?exit=\{[\s\S]*?transition=\{[\s\S]*?\}/g,
        (match, g1) => {
            // Find class name
            const classNameMatch = match.match(/className=\{styles\.(\w+)\}/);
            const className = classNameMatch ? classNameMatch[1] : 'modal';
            return `className={styles.${className}} ${g1} initial={{ opacity: 0, y: 6 }}\n                        animate={{ opacity: 1, y: 0 }}\n                        exit={{ opacity: 0, y: 4 }}\n                        transition={{ duration: 0.15 }}`;
        }
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
}
