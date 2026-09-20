const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf8');

content = content.replace(/client\.datasetId/g, 'client.bigQueryDatasets[0]');
content = content.replace(/client\.leadLedgerTable/g, "client.semanticMappings.tables.leads.split('.').pop()");
content = content.replace(/client\.clientName/g, 'client.name');

fs.writeFileSync('server/api.ts', content);
