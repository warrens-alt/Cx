const fs = require('fs');
let content = fs.readFileSync('src/pages/DataCoverage.tsx', 'utf8');

if (!content.includes('import { formatTableNumber }')) {
  content = content.replace(
    "import React, { useEffect, useState } from 'react';",
    "import React, { useEffect, useState } from 'react';\nimport { formatTableNumber } from '../lib/formatters';"
  );
}

content = content.replace(/\{Number\(d\.rows\)\.toLocaleString\(\)\}/g, "{formatTableNumber(d.rows)}");
content = content.replace(/\{Number\(d\.total_transactions\)\.toLocaleString\(\)\}/g, "{formatTableNumber(d.total_transactions)}");

fs.writeFileSync('src/pages/DataCoverage.tsx', content);
