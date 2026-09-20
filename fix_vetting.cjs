const fs = require('fs');
let content = fs.readFileSync('src/pages/QualityVetting.tsx', 'utf8');

if (!content.includes('import { formatTableNumber }')) {
  content = content.replace(
    "import React",
    "import React from 'react';\nimport { formatTableNumber } from '../lib/formatters';"
  );
}

content = content.replace(/\{row\.count\.toLocaleString\(\)\}/g, "{formatTableNumber(row.count)}");

fs.writeFileSync('src/pages/QualityVetting.tsx', content);
