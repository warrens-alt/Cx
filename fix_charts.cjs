const fs = require('fs');

const updateChart = (path) => {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  if (!content.includes('import { formatChartAxis }')) {
    content = content.replace(
      "import React",
      "import React from 'react';\nimport { formatChartAxis } from '../../lib/formatters';"
    );
    // clean up duplicate React imports
    content = content.replace(/import React from 'react';\nimport React/, "import React");
  }

  // Replace tickFormatter={(val) => val.toLocaleString()} or similar
  content = content.replace(/tickFormatter=\{\(val\) => [^\}]+\}/g, "tickFormatter={(val) => formatChartAxis(val)}");
  // Also any missing ones on YAxis:
  content = content.replace(/<YAxis\s+([^\>]+)axisLine=\{false\}/, (match, p1) => {
    if (!match.includes('tickFormatter')) {
      return `<YAxis ${p1} axisLine={false} tickFormatter={(val) => formatChartAxis(val)}`;
    }
    return match;
  });

  fs.writeFileSync(path, content);
}

updateChart('src/components/charts/ComboChart.tsx');
updateChart('src/components/charts/TrendChart.tsx');
updateChart('src/components/charts/BarChart.tsx');

