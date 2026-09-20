const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// Replace medium as vendor with medium, vendor
content = content.replace(
  'source,\n      medium as vendor,\n      grade,\n      vetting,\n      valid_lead',
  'source,\n      medium,\n      vendor,\n      grade,\n      vetting,\n      valid_lead'
);

// Add medium to Sets
content = content.replace(
  'const sources = new Set<string>();',
  'const sources = new Set<string>();\n  const mediums = new Set<string>();'
);

content = content.replace(
  'if (r.source) sources.add(r.source);',
  'if (r.source) sources.add(r.source);\n    if (r.medium) mediums.add(r.medium);'
);

content = content.replace(
  'sources: Array.from(sources).sort(),',
  'sources: Array.from(sources).sort(),\n    mediums: Array.from(mediums).sort(),'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
