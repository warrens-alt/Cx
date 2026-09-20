const fs = require('fs');

const fixHBar = () => {
  let content = fs.readFileSync('src/components/charts/HorizontalBarChart.tsx', 'utf8');

  if (!content.includes('import { formatChartAxis }')) {
    content = content.replace(
      "import React from 'react';",
      "import React from 'react';\nimport { formatChartAxis } from '../../lib/formatters';"
    );
  }

  content = content.replace(/tickFormatter=\{\(val\) => \{[\s\S]*?\}\}/, 
    "tickFormatter={(val) => `${valuePrefix}${formatChartAxis(val)}${valueSuffix}`}"
  );
  
  fs.writeFileSync('src/components/charts/HorizontalBarChart.tsx', content);
}
fixHBar();
