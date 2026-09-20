const fs = require('fs');
let content = fs.readFileSync('src/pages/Funnel.tsx', 'utf8');
content = content.replace(/import DataAuditDrawer from '\.\.\/components\/DataAuditDrawer';\n/, '');
content = content.replace(/import \{ Table as TableIcon \} from 'lucide-react';\n/, '');
fs.writeFileSync('src/pages/Funnel.tsx', content);
