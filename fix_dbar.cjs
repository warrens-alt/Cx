const fs = require('fs');

const fixDBar = () => {
  let content = fs.readFileSync('src/components/charts/DistributionBar.tsx', 'utf8');

  if (!content.includes('import { formatKpiValue, formatChartAxis }')) {
    content = content.replace(
      "import React from 'react';",
      "import React from 'react';\nimport { formatKpiValue, formatChartAxis } from '../../lib/formatters';"
    );
  }

  content = content.replace(
    "const defaultFormat = (val: number) => val.toLocaleString();",
    "const defaultFormat = (val: number) => formatKpiValue(val);"
  );

  content = content.replace(/<YAxis \s*axisLine=\{false\}/, 
    "<YAxis axisLine={false} tickFormatter={(val) => formatChartAxis(val)}"
  );
  
  fs.writeFileSync('src/components/charts/DistributionBar.tsx', content);
}
fixDBar();
