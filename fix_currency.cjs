const fs = require('fs');

const fixFile = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('useClient')) {
    content = `import { useClient } from '../lib/ClientContext';\n` + content;
  }
  
  if (content.includes('export default function')) {
    content = content.replace(/export default function \w+\(\) \{/, (match) => {
      return match + `\n  const { clientConfig } = useClient();\n  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';`;
    });
    
    content = content.replace(/valuePrefix="[^"]+"/g, 'valuePrefix={currencyPrefix}');
    content = content.replace(/prefix="[^"]+"/g, 'prefix={currencyPrefix}');
  }
  fs.writeFileSync(path, content);
};

fixFile('src/pages/Outcomes.tsx');
fixFile('src/pages/SourceAnalysis.tsx');
