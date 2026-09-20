const fs = require('fs');

function replaceAll(file, search, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(search).join(replacement);
  fs.writeFileSync(file, content);
}

replaceAll('server/api.ts', 'client.projectId', 'client.bigQueryProject');
replaceAll('server/bigquery/queries.ts', 'client.projectId', 'client.bigQueryProject');
replaceAll('server/bigquery/semantic_engine.ts', 'client.projectId', 'client.bigQueryProject');
replaceAll('server/bigquery/views.ts', 'client.clientId', 'client.id');

let qContent = fs.readFileSync('server/bigquery/queries.ts', 'utf8');
qContent = qContent.replace(/client\.platformInsightsTable/g, 'client.semanticMappings.tables.marketing');
fs.writeFileSync('server/bigquery/queries.ts', qContent);

let sContent = fs.readFileSync('server/bigquery/semantic_engine.ts', 'utf8');
sContent = sContent.replace(/campaign: "IFNULL\\(medium, 'Unknown'\\)",\\n\\s*campaign: "IFNULL\\(medium, 'Unknown'\\)",/g, 'campaign: "IFNULL(medium, \'Unknown\')",');
fs.writeFileSync('server/bigquery/semantic_engine.ts', sContent);

