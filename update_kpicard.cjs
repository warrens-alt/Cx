const fs = require('fs');

let content = fs.readFileSync('src/components/KpiCard.tsx', 'utf8');

if (!content.includes('import { formatKpiValue }')) {
  content = content.replace(
    "import MetricLineageDrawer from './MetricLineageDrawer';",
    "import MetricLineageDrawer from './MetricLineageDrawer';\nimport { formatKpiValue } from '../lib/formatters';"
  );
}

content = content.replace(
  '<span className="text-kpi-value">{value}</span>',
  '<span className="text-kpi-value">{typeof value === "number" ? formatKpiValue(value) : value}</span>'
);

fs.writeFileSync('src/components/KpiCard.tsx', content);
