const fs = require('fs');
let content = fs.readFileSync('server/queries.ts', 'utf8');

content = content.replace(
  /COUNTIF\(duplicate_flag = true\)/g,
  '0'
);
content = content.replace(
  /COUNTIF\(duplicate_flag = false\)/g,
  '0'
);

fs.writeFileSync('server/queries.ts', content);
