const fs = require('fs');

let content = fs.readFileSync('src/pages/Ledger.tsx', 'utf8');

content = content.replace(
  /import \{ formatTableNumber, formatTableCurrency \} from '\.\.\/lib\/formatters';, \{ useState, useEffect, useMemo \} from 'react';/,
  "import React, { useState, useEffect, useMemo } from 'react';\nimport { formatTableNumber, formatTableCurrency } from '../lib/formatters';"
);

// Also check for 'import React from 'react';' at the top and remove it since it's now in the combined import
content = content.replace(/^import React from 'react';\n/, '');

fs.writeFileSync('src/pages/Ledger.tsx', content);
