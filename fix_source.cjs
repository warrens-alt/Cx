const fs = require('fs');
let content = fs.readFileSync('src/pages/SourceAnalysis.tsx', 'utf8');

if (!content.includes('import { formatTableNumber }')) {
  content = content.replace(
    "import React",
    "import React from 'react';\nimport { formatTableNumber } from '../lib/formatters';"
  );
}

content = content.replace(/\{row\.leads\.toLocaleString\(\)\}/g, "{formatTableNumber(row.leads)}");

fs.writeFileSync('src/pages/SourceAnalysis.tsx', content);
