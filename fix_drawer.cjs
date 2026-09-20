const fs = require('fs');

let drawerTs = fs.readFileSync('src/components/DataAuditDrawer.tsx', 'utf8');

// Undo the sed
drawerTs = drawerTs.replace(/<div className="flex flex-col h-full">/, '');
drawerTs = drawerTs.replace(/<\/div>\s*<\/div>/, '</div>');

// Add fragment
drawerTs = drawerTs.replace(/:\s*\(\s*<div className="mb-4/, ': (\n            <>\n              <div className="mb-4');
drawerTs = drawerTs.replace(/<\/div>\s*\)\}\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/>\s*\);\s*\}/, '</div>\n              )} \n            </div>\n            </>\n          )}\n        </div>\n      </div>\n    </>\n  );\n}');

fs.writeFileSync('src/components/DataAuditDrawer.tsx', drawerTs);
