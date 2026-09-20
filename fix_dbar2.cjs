const fs = require('fs');
let content = fs.readFileSync('src/components/charts/DistributionBar.tsx', 'utf8');
content = content.replace(/<YAxis axisLine=\{false\} tickFormatter=\{\(val\) => formatChartAxis\(val\)\}\s+type="number"\s+hide\s+tickFormatter=\{formatter\}\s+\/>/, 
  `<YAxis axisLine={false} tickFormatter={formatter} type="number" hide />`
);
fs.writeFileSync('src/components/charts/DistributionBar.tsx', content);
