const fs = require('fs');
let content = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

content = content.replace(/<TrendChart\n\s*title="Leads Trend"/, `<TrendChart\n              title="Leads Trend"\n              auditTitle="Leads Trend Audit"\n              auditGrain="lead"`);

content = content.replace(/<FunnelWaterfall\n\s*title="Core Funnel"/, `<FunnelWaterfall\n              title="Core Funnel"\n              auditTitle="Core Funnel Audit"\n              auditGrain="lead"`);

content = content.replace(/<HorizontalBarChart\n\s*title="Top Sources"/, `<HorizontalBarChart\n              title="Top Sources"\n              auditTitle="Top Sources Audit"\n              auditGrain="lead"`);

fs.writeFileSync('src/pages/Overview.tsx', content);
