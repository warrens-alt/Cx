const fs = require('fs');
let code = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

code = code.replace(/change=\{[0-9\.\-]+\}/g, 'change={0}');
// Restore the valid ones
code = code.replace(/change=\{0\}\s*lineage=\{METRICS\.total_leads\}/g, 'change={metrics.leadsChange || 0} \n              lineage={METRICS.total_leads}');
code = code.replace(/change=\{0\}\s*lineage=\{METRICS\.delivered_leads\}/g, 'change={metrics.deliveredChange || 0} \n              lineage={METRICS.delivered_leads}');
code = code.replace(/change=\{0\}\s*lineage=\{METRICS\.called_leads\}/g, 'change={metrics.calledChange || 0} \n              lineage={METRICS.called_leads}');
code = code.replace(/change=\{0\}\s*lineage=\{METRICS\.rpcs\}/g, 'change={metrics.rpcsChange || 0} \n              lineage={METRICS.rpcs}');
code = code.replace(/change=\{0\}\s*lineage=\{METRICS\.sales\}/g, 'change={metrics.salesChange || 0} \n              lineage={METRICS.sales}');
code = code.replace(/change=\{0\}\s*lineage=\{METRICS\.activations\}/g, 'change={metrics.activationsChange || 0} \n              lineage={METRICS.activations}');
code = code.replace(/change=\{0\}\s*prefix="R "\s*lineage=\{METRICS\.revenue\}/g, 'change={metrics.revenueChange || 0} \n              prefix="R " \n              lineage={METRICS.revenue}');

fs.writeFileSync('src/pages/Overview.tsx', code);
