const fs = require('fs');
let content = fs.readFileSync('src/components/DataAuditDrawer.tsx', 'utf8');

content = content.replace(/<span className="font-semibold text-text-main">\{uniqueLeads\.toLocaleString\(\)\}<\/span>\n\s*<\/div>/, `<span className="font-semibold text-text-main">{uniqueLeads.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Data As Of</span>
            <span className="font-semibold text-text-main">{new Date().toLocaleString()}</span>
          </div>`);

fs.writeFileSync('src/components/DataAuditDrawer.tsx', content);
