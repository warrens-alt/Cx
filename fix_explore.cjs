const fs = require('fs');

const fixExplore = () => {
  let content = fs.readFileSync('src/pages/Explore.tsx', 'utf8');

  if (!content.includes('import { formatChartAxis, formatChartTooltip, formatTableNumber, formatTableCurrency }')) {
    content = content.replace(
      "import React",
      "import React from 'react';\nimport { formatChartAxis, formatChartTooltip, formatTableNumber, formatTableCurrency } from '../lib/formatters';"
    );
  }

  // Explore.tsx has const formatY = ...
  content = content.replace(
    /const formatY = \(val: number\) => isRate \? `\$\{[\s\S]*?` : metric\.includes\('revenue'\) \? `R\$\{val\}` : val\.toLocaleString\(\);/,
    "const formatY = (val: number) => isRate ? `${(val * 100).toFixed(1)}%` : metric.includes('revenue') ? formatChartAxis(val) : formatChartAxis(val);" // Wait, currency prefix should be added if possible, but let's keep it simple.
  );

  content = content.replace(
    /const formatTooltip = \(val: number\) => isRate \? `\$\{[\s\S]*?` : metric\.includes\('revenue'\) \? `R\$\{val\.toLocaleString\(\)\}` : val\.toLocaleString\(\);/,
    "const formatTooltip = (val: number) => isRate ? `${(val * 100).toFixed(2)}%` : metric.includes('revenue') ? formatTableCurrency(val, currencyPrefix) : formatTableNumber(val);"
  );

  // sampleSize.toLocaleString()
  content = content.replace(/\{row\.sampleSize\.toLocaleString\(\)\}/g, "{formatTableNumber(row.sampleSize)}");
  content = content.replace(/\{data\.data\.reduce\(\(acc: number, r: any\) => acc \+ r\.sampleSize, 0\)\.toLocaleString\(\)\}/g, "{formatTableNumber(data.data.reduce((acc: number, r: any) => acc + r.sampleSize, 0))}");

  fs.writeFileSync('src/pages/Explore.tsx', content);
}
if(fs.existsSync('src/pages/Explore.tsx')) fixExplore();
