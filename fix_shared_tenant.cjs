const fs = require('fs');
let content = fs.readFileSync('server/bigquery/views.ts', 'utf8');

// If the client configuration uses a shared data source mode, we must append the tenant isolation clause
content = content.replace(/FROM \\\`\$\{client\.semanticMappings\.tables\.leads\}\\\` l/, 
  `FROM \\\`\${client.semanticMappings.tables.leads}\\\` l
      \${client.dataSourceMode === 'shared' && client.sharedTenantIdField ? \`WHERE l.\${client.sharedTenantIdField} = '\${client.sharedTenantIdValue}'\` : ''}`);

fs.writeFileSync('server/bigquery/views.ts', content);
