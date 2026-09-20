const fs = require('fs');
let exportTs = fs.readFileSync('server/bigquery/export.ts', 'utf8');

// Replace the SELECT block for 'lead' grain with SELECT *
exportTs = exportTs.replace(
  /SELECT\s+lead_id as `Lead ID`[\s\S]*?FROM vw_leads/,
  'SELECT * EXCEPT(client_id, duplicate_flag) FROM vw_leads'
);

// Add hlc_record_number to transaction export
exportTs = exportTs.replace(
  /lead_id as `Lead ID`,/,
  'lead_id as `Lead ID`,\n        hlc_record_number as `HLC Record Number`,'
);

fs.writeFileSync('server/bigquery/export.ts', exportTs);
