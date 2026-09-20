const fs = require('fs');
let dq = fs.readFileSync('src/pages/DataQuality.tsx', 'utf8');
if (!dq.includes("import { formatTableNumber")) {
  dq = dq.replace(/import React, \{ useCallback \} from 'react';/, "import React, { useCallback } from 'react';\nimport { formatTableNumber, formatTableCurrency } from '../lib/formatters';");
}
fs.writeFileSync('src/pages/DataQuality.tsx', dq);
