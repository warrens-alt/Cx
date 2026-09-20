const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf8');

content = content.replace(/const result = await exportData\(params\);/, `const result = await exportData(params);
    
    // Audit Logging
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'DATA_EXPORT',
      client: params.clientId,
      grain: params.grain,
      format: params.format,
      filters: params.filters
    }));`);

content = content.replace(/filename="export-\$\{params.clientId\}-\$\{params.grain\}.csv"/, `filename="\${params.clientId}_\${params.grain}_export_\${new Date().toISOString().split('T')[0]}.csv"`);

fs.writeFileSync('server/api.ts', content);
