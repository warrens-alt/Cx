const fs = require('fs');
let content = fs.readFileSync('src/components/DataAuditDrawer.tsx', 'utf8');

if (!content.includes('import { formatTableNumber }')) {
  content = content.replace(
    "import React",
    "import React from 'react';\nimport { formatTableNumber } from '../lib/formatters';"
  );
  content = content.replace(/import React from 'react';\nimport React/, "import React");
}

content = content.replace(/\{data\.length\.toLocaleString\(\)\}/g, "{formatTableNumber(data.length)}");
content = content.replace(/\{uniqueLeads\.toLocaleString\(\)\}/g, "{formatTableNumber(uniqueLeads)}");

fs.writeFileSync('src/components/DataAuditDrawer.tsx', content);
