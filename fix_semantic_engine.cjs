const fs = require('fs');
let content = fs.readFileSync('server/bigquery/semantic_engine.ts', 'utf8');

content = content.replace(
  'vendor: "IFNULL(medium, \'Unknown\')",',
  'vendor: "IFNULL(vendor, \'Unknown\')",\n  medium: "IFNULL(medium, \'Unknown\')",\n  campaign: "IFNULL(medium, \'Unknown\')", // alias if needed'
);

content = content.replace(
  'vendor: "IFNULL(medium, \'Unknown\')",\n  campaign: "IFNULL(medium, \'Unknown\')",',
  '' // This is just in case I double matched. I'll use simple string replace
);

// Actually, I'll just rewrite the file content manually with regex
content = content.replace(/vendor: "IFNULL\(medium, 'Unknown'\)",/, `vendor: "IFNULL(vendor, 'Unknown')",\n  medium: "IFNULL(medium, 'Unknown')",`);
content = content.replace(/clauses\.push\(\`medium = @vendorFilter\`\);/, "clauses.push(`vendor = @vendorFilter`);");

fs.writeFileSync('server/bigquery/semantic_engine.ts', content);
