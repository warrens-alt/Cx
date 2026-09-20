const fs = require('fs');
let drawerTs = fs.readFileSync('src/components/DataAuditDrawer.tsx', 'utf8');

drawerTs = drawerTs.replace(
  /Showing first 100 of \{data\.length\.toLocaleString\(\)\} rows\. Export to see all records\.\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/>/,
  'Showing first 100 of {data.length.toLocaleString()} rows. Export to see all records.\n                </div>\n              )}\n            </div>\n            </>'
);

fs.writeFileSync('src/components/DataAuditDrawer.tsx', drawerTs);
