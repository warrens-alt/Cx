const fs = require('fs');

// Fix config imports
['server/bigquery/discovery.ts', 'server/bigquery/export.ts', 'server/bigquery/views.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/ClientConfiguration/g, 'TenantConfiguration');
  fs.writeFileSync(file, content);
});

// Fix GlobalFilter.tsx
let gf = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');
gf = gf.replace(
  /\{clients\.length > 0 \? \([\s\S]*?<\/select>\n\s*\) : \([\s\S]*?<\/span>\n\s*\)\}/g,
  ""
);
// I need to ensure it's removed correctly. 
fs.writeFileSync('src/components/GlobalFilter.tsx', gf);

// Fix DataQuality.tsx
let dq = fs.readFileSync('src/pages/DataQuality.tsx', 'utf8');
if (!dq.includes('formatTableNumber')) {
  dq = dq.replace(/import \{ formatTableNumber, formatTableCurrency \} from '\.\.\/lib\/formatters';/g, ''); // cleanup
  dq = dq.replace(/(import React.*?from 'react';)/, "$1\nimport { formatTableNumber, formatTableCurrency } from '../lib/formatters';");
}
fs.writeFileSync('src/pages/DataQuality.tsx', dq);

// Fix Explore.tsx
let ex = fs.readFileSync('src/pages/Explore.tsx', 'utf8');
if (!ex.includes('useState')) {
  ex = ex.replace(/import React from 'react';/, "import React, { useState, useEffect } from 'react';");
}
fs.writeFileSync('src/pages/Explore.tsx', ex);
