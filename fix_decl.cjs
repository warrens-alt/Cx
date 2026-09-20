const fs = require('fs');

let file = fs.readFileSync('server/bigquery/semantic_engine.ts', 'utf8');

file = file.replace(
  /if \(!getAllowedDimensions\(client.timezone\)\[dimension\]\) throw new Error\(`Invalid dimension: \$\{dimension\}`\);\n  if \(secondaryDimension && !getAllowedDimensions\(client.timezone\)\[secondaryDimension\]\) throw new Error\(`Invalid secondary dimension: \$\{secondaryDimension\}`\);\n\n  const client = getClientConfig\(clientId\);/,
  "const client = getClientConfig(clientId);\n  if (!getAllowedDimensions(client.timezone)[dimension]) throw new Error(`Invalid dimension: ${dimension}`);\n  if (secondaryDimension && !getAllowedDimensions(client.timezone)[secondaryDimension]) throw new Error(`Invalid secondary dimension: ${secondaryDimension}`);"
);

fs.writeFileSync('server/bigquery/semantic_engine.ts', file);
