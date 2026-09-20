const fs = require('fs');
let content = fs.readFileSync('src/pages/LeadExplorer.tsx', 'utf8');

content = content.replace(/<\/PageHeader>\s*<\/div>\s*<div className="enterprise-card flex-1 flex flex-col min-h-0 overflow-hidden">/, '</PageHeader>\n      <div className="enterprise-card flex-1 flex flex-col min-h-0 overflow-hidden">');

fs.writeFileSync('src/pages/LeadExplorer.tsx', content);
