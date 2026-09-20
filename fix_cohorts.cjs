const fs = require('fs');
let content = fs.readFileSync('src/pages/Cohorts.tsx', 'utf8');

if (!content.includes('import { formatTableNumber }')) {
  content = content.replace(
    "import React",
    "import React from 'react';\nimport { formatTableNumber } from '../lib/formatters';"
  );
}

content = content.replace(/\{row\.size\.toLocaleString\(\)\}/g, "{formatTableNumber(row.size)}");

fs.writeFileSync('src/pages/Cohorts.tsx', content);
