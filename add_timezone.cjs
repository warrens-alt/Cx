const fs = require('fs');
let content = fs.readFileSync('src/components/DataAuditDrawer.tsx', 'utf8');

if (!content.includes('Timezone')) {
  content = content.replace(/<span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Data As Of<\/span>/, 
    `<span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Timezone</span>
            <span className="font-semibold text-text-main">{clientConfig?.timezone || 'UTC'}</span>
          </div>
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Data As Of</span>`);

  content = content.replace(/const \{ selectedClient \} = useClient\(\);/, `const { selectedClient, clientConfig } = useClient();`);

  fs.writeFileSync('src/components/DataAuditDrawer.tsx', content);
}
