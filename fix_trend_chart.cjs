const fs = require('fs');
let content = fs.readFileSync('src/components/charts/TrendChart.tsx', 'utf8');

content = content.replace(/options\?: \{ label: string; value: string \}\[\];/, `options?: { label: string; value: string }[];\n  auditTitle?: string;\n  auditContext?: any;\n  auditGrain?: string;`);
content = content.replace(/selectedOption\n\}: TrendChartProps\)/, `selectedOption,\n  auditTitle,\n  auditContext,\n  auditGrain\n}: TrendChartProps)`);

content = content.replace(/<ChartToolbar title=\{title\} subtitle=\{subtitle\}>/, `<ChartToolbar title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain}>`);

fs.writeFileSync('src/components/charts/TrendChart.tsx', content);
