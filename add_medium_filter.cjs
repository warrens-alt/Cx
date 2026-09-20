const fs = require('fs');
let content = fs.readFileSync('server/bigquery/semantic_engine.ts', 'utf8');

content = content.replace(
  `if (filters.vendor) {\n    clauses.push(\`vendor = @vendorFilter\`);\n    queryParams.vendorFilter = filters.vendor;\n  }`,
  `if (filters.vendor) {\n    clauses.push(\`vendor = @vendorFilter\`);\n    queryParams.vendorFilter = filters.vendor;\n  }\n  if (filters.medium) {\n    clauses.push(\`medium = @mediumFilter\`);\n    queryParams.mediumFilter = filters.medium;\n  }`
);

fs.writeFileSync('server/bigquery/semantic_engine.ts', content);
