const fs = require('fs');

let client = fs.readFileSync('server/bigquery/client.ts', 'utf8');
const replacementClient = "FROM \\`" + "${projectId}.${datasetId}.${tableId}" + "\\` LIMIT 1";
client = client.replace(/FROM .* LIMIT 1/, replacementClient);
fs.writeFileSync('server/bigquery/client.ts', client);

let views = fs.readFileSync('server/bigquery/views.ts', 'utf8');
const replacementViews = "FROM \\`" + "${client.projectId}.${client.datasetId}.${client.leadLedgerTable}" + "\\`";
views = views.replace(/FROM .*/, replacementViews);
fs.writeFileSync('server/bigquery/views.ts', views);
