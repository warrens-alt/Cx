const fs = require('fs');
let content = fs.readFileSync('src/lib/ClientContext.tsx', 'utf8');

content = content.replace(/p\.set\('client', id\);/, `p.set('client', id);
      p.delete('filters');
      p.delete('source');
      p.delete('vendor');`);

fs.writeFileSync('src/lib/ClientContext.tsx', content);
