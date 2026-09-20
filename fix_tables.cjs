const fs = require('fs');

const fixAcquisition = () => {
  let content = fs.readFileSync('src/pages/Acquisition.tsx', 'utf8');

  if (!content.includes('import { formatTableNumber, formatTableCurrency }')) {
    content = content.replace(
      "import React",
      "import React from 'react';\nimport { formatTableNumber, formatTableCurrency } from '../lib/formatters';"
    );
  }

  content = content.replace(
    /<td>R\{c\.spend\.toLocaleString\(undefined, \{minimumFractionDigits: 2, maximumFractionDigits: 2\}\)\}<\/td>/g,
    "<td>{formatTableCurrency(c.spend, currencyPrefix)}</td>"
  );
  content = content.replace(/\{c\.impressions\.toLocaleString\(\)\}/g, "{formatTableNumber(c.impressions)}");
  content = content.replace(/\{c\.clicks\.toLocaleString\(\)\}/g, "{formatTableNumber(c.clicks)}");
  content = content.replace(/\{c\.leads\.toLocaleString\(\)\}/g, "{formatTableNumber(c.leads)}");

  fs.writeFileSync('src/pages/Acquisition.tsx', content);
}
if(fs.existsSync('src/pages/Acquisition.tsx')) fixAcquisition();
