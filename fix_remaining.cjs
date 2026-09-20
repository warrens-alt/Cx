const fs = require('fs');

let ex = fs.readFileSync('src/pages/Explore.tsx', 'utf8');
if (!ex.includes('import { useState')) {
  ex = ex.replace(/import React from 'react';/, "import React, { useState, useEffect } from 'react';");
}
fs.writeFileSync('src/pages/Explore.tsx', ex);

let dq = fs.readFileSync('src/pages/DataQuality.tsx', 'utf8');
if (!dq.includes('formatTableNumber')) {
  dq = dq.replace(/import React from 'react';/, "import React from 'react';\nimport { formatTableNumber, formatTableCurrency } from '../lib/formatters';");
}
fs.writeFileSync('src/pages/DataQuality.tsx', dq);
