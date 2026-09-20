const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

if (!content.includes('useClient')) {
  content = `import { useClient } from '../lib/ClientContext';\n` + content;
}

content = content.replace(/export default function Settings\(\) \{/, `export default function Settings() {
  const { selectedClient } = useClient();`);

content = content.replace(/useEffect\(\(\) => \{/, `useEffect(() => {
    if (!selectedClient) return;`);

content = content.replace(/fetch\('\/api\/analytics\/health\?clientId=default'\)/, `fetch(\`/api/analytics/health?clientId=\${selectedClient}\`)`);
content = content.replace(/\[\]\);/, `[selectedClient]);`);

fs.writeFileSync('src/pages/Settings.tsx', content);
