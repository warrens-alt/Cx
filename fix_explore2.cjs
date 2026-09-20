const fs = require('fs');

const fixExplore2 = () => {
  let content = fs.readFileSync('src/pages/Explore.tsx', 'utf8');

  content = content.replace(
    /const formatTooltip = \([\s\S]*?;\n/,
    "const currencyPrefix = data?.metadata?.currency || 'R ';\n  const formatTooltip = (val: number) => isRate ? `${(val * 100).toFixed(2)}%` : metric.includes('revenue') ? formatTableCurrency(val, currencyPrefix) : formatTableNumber(val);\n"
  );
  
  // also fix import issue React from 'react' that might be messy:
  content = content.replace(/import React from 'react';import \{ formatChartAxis/, "import React, { useState } from 'react';\nimport { formatChartAxis");
  content = content.replace(/, \{ useState \} from 'react';/, "");

  fs.writeFileSync('src/pages/Explore.tsx', content);
}
fixExplore2();
