const fs = require('fs');
let api = fs.readFileSync('server/api.ts', 'utf8');

api = api.replace(
  "['campaigns', 'grades', 'vetting', 'outcomes'].forEach(",
  "['campaigns', 'grades', 'vetting'].forEach("
);

fs.writeFileSync('server/api.ts', api);
