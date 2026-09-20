const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/FROM \$\{tableClustered\} c/g, 'FROM \\`\${tableClustered}\\` c');
code = code.replace(/FROM \`\$\{tableClustered\}\` c/g, 'FROM \\`\${tableClustered}\\` c');
fs.writeFileSync('server.ts', code);
