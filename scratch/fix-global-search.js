const fs = require('fs');
let code = fs.readFileSync('components/layout/GlobalSearch.tsx', 'utf8');
code = code.replace(/return \(\) => window.removeEventListener\('keydown', handleKeyDown\);\n    \}, \[\]\);\n\n        return \(\) => window.removeEventListener\('keydown', handleKeyDown\);\n    \}, \[\]\);/g, "return () => window.removeEventListener('keydown', handleKeyDown);\n    }, []);");
fs.writeFileSync('components/layout/GlobalSearch.tsx', code);
