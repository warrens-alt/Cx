import fs from 'fs';
let content = fs.readFileSync('src/pages/MultiHopArbitrage.tsx', 'utf8');
content = content.replace("tickFormatter={(val) => \\`\\${val}%\\`}", "tickFormatter={(val) => `${val}%`}");
fs.writeFileSync('src/pages/MultiHopArbitrage.tsx', content);
