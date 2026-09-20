const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// I will add a vendor performance query if there isn't one, or maybe one of the queries is supposed to use the vendor table.
// Let's check getFilterOptions. Does it query vw_leads or vw_lead_vendor_transactions?

content = content.replace(
  /FROM vw_leads\s*\n\s*GROUP BY/g,
  'FROM vw_leads\n    GROUP BY'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
