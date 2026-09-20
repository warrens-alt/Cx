const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// In getDataHealthStats:
content = content.replace(/COUNTIF\(has_delivery = false AND rpc = true\) as missing_delivery_with_rpc/, 
  'COUNTIF(has_delivery = false AND has_rpc = true) as missing_delivery_with_rpc');

// In getCallPerformanceStats:
content = content.replace(/COUNTIF\(rpc = true\) as rpc_count,\n\s*COUNTIF\(has_sale = true\) as sale_count/g, 
  'COUNTIF(has_rpc = true) as rpc_count,\n      COUNTIF(has_sale = true) as sale_count');

// In getLeads (status logic):
content = content.replace(/WHEN rpc = true THEN 'Contacted'/, 
  "WHEN has_rpc = true THEN 'Contacted'");

fs.writeFileSync('server/bigquery/queries.ts', content);
