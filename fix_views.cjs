const fs = require('fs');
let content = fs.readFileSync('server/bigquery/views.ts', 'utf8');

content = content.replace(/ClientDataSource/g, 'ClientConfiguration');
content = content.replace(/client\.projectId\}\.\$\{client\.datasetId\}\.\$\{client\.leadLedgerTable/g, 'client.semanticMappings.tables.leads');

content = content.replace(/client\.platformInsightsTable/g, 'client.semanticMappings.tables.marketing');
content = content.replace(/client\.vicidialInsightsTable/g, 'client.semanticMappings.tables.calls');
content = content.replace(/client\.vicidialTimeToDialTable/g, 'client.semanticMappings.tables.timeToDial');
content = content.replace(/client\.activationsTable/g, 'client.semanticMappings.tables.activations');

content = content.replace(/\$\{client\.projectId\}\.\$\{client\.datasetId\}\.\$\{/g, '${'); // Removing prefix as semanticMappings are fully qualified

fs.writeFileSync('server/bigquery/views.ts', content);
