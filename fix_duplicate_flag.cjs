const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /COUNTIF\(duplicate_flag = true\)/g,
  '0'
);
content = content.replace(
  /COUNTIF\(duplicate_flag = false\)/g,
  '0'
);

fs.writeFileSync('server/bigquery/queries.ts', content);

let metricsContent = fs.readFileSync('server/bigquery/metrics.ts', 'utf8');
metricsContent = metricsContent.replace(
  /COUNTIF\(duplicate_flag = true\)/g,
  '0'
);
fs.writeFileSync('server/bigquery/metrics.ts', metricsContent);
