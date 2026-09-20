const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /FROM vw_leads\s+\${where}/g,
  'FROM vw_lead_vendor_transactions\n    ${where}'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
