const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

code = code.replace(/\\`/g, "`");
code = code.replace(/\\\$/g, "$");

fs.writeFileSync('src/pages/Settings.tsx', code);
