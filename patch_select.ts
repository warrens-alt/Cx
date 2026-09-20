import fs from 'fs';
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
content = content.replace('{p.name} ({p.id})', '{p.name === p.id ? p.name : `${p.name} (${p.id})`}');
fs.writeFileSync('src/pages/Settings.tsx', content);
