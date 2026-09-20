const fs = require('fs');

const fixFile = (path) => {
  if(!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('useClient')) {
    content = `import { useClient } from '../lib/ClientContext';\n` + content;
  }
  
  if (content.includes('export default function')) {
    content = content.replace(/export default function \w+\(\) \{/, (match) => {
      return match + `\n  const { clientConfig } = useClient();\n  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';`;
    });
    
    content = content.replace(/prefix="R\s*"/g, 'prefix={currencyPrefix}');
  }
  fs.writeFileSync(path, content);
};

fixFile('src/pages/Assumptions.tsx');
fixFile('src/pages/Acquisition.tsx');
fixFile('src/pages/Overview.tsx');
