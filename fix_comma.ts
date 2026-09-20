import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace("CreditCard\n  Zap,", "CreditCard,\n  Zap,");
fs.writeFileSync('src/App.tsx', content);
