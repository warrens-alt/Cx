const fs = require('fs');
let content = fs.readFileSync('src/components/charts/DistributionBar.tsx', 'utf8');
content = content.replace(/<YAxis axisLine=\{false\} tickFormatter=\{\(val\) => formatChartAxis\(val\)\}\s+tickLine=\{false\}\s+tick=\{\{ fontSize: 11, fill: '#64748b' \}\}\s+tickFormatter=\{formatter\}/, 
  `<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => formatChartAxis(val)}`
);
fs.writeFileSync('src/components/charts/DistributionBar.tsx', content);
