const fs = require('fs');
let content = fs.readFileSync('src/components/charts/FunnelWaterfall.tsx', 'utf8');

content = content.replace(/className="mb-6"/, 'className="mb-5"');
content = content.replace(/className="text-lg font-semibold text-text-main leading-tight"/, 'className="text-card-title text-text-main font-semibold"');
content = content.replace(/className="text-sm font-medium text-text-sec mt-1"/, 'className="text-[12px] text-text-sec mt-0.5"');

fs.writeFileSync('src/components/charts/FunnelWaterfall.tsx', content);
