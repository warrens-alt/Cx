const fs = require('fs');

let file = fs.readFileSync('src/pages/CallPerformance.tsx', 'utf8');

file = file.replace(/<div className="enterprise-card p-6">\s*<div className="text-sm font-medium text-secondary-text mb-1">Avg Calls \/ Lead[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, "");

fs.writeFileSync('src/pages/CallPerformance.tsx', file);
