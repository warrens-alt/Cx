const fs = require('fs');

let content = fs.readFileSync('src/components/charts/FunnelWaterfall.tsx', 'utf8');

if (!content.includes('import { formatKpiValue }')) {
  content = content.replace(
    "import React from 'react';",
    "import React from 'react';\nimport { formatKpiValue } from '../../lib/formatters';"
  );
}

content = content.replace(
  /\{step\.value\.toLocaleString\(\)\}/g,
  "{formatKpiValue(step.value)}"
);

content = content.replace(
  /\-\{dropoffFromPrev\.toLocaleString\(\)\}/g,
  "-{formatKpiValue(dropoffFromPrev)}"
);

fs.writeFileSync('src/components/charts/FunnelWaterfall.tsx', content);
