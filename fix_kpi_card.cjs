const fs = require('fs');
let content = fs.readFileSync('src/components/KpiCard.tsx', 'utf8');

content = `import DataAuditDrawer from './DataAuditDrawer';\nimport { Table as TableIcon } from 'lucide-react';\n` + content;
content = content.replace(/const \[drawerOpen, setDrawerOpen\] = useState\(false\);/, `const [drawerOpen, setDrawerOpen] = useState(false);\n  const [auditOpen, setAuditOpen] = useState(false);`);

content = content.replace(/<Info className="w-4 h-4" \/>\n\s*<\/button>\n\s*\)}/, `<Info className="w-4 h-4" />
            </button>
          )}
          {lineage && (
            <button onClick={() => setAuditOpen(true)} className="text-text-mute hover:text-teal transition-colors focus:outline-none ml-2" title="View Data">
              <TableIcon className="w-4 h-4" />
            </button>
          )}`);

content = content.replace(/<MetricLineageDrawer/, `{lineage && (
        <DataAuditDrawer
          isOpen={auditOpen}
          onClose={() => setAuditOpen(false)}
          title={\`Data Audit: \${title}\`}
          contextFilters={lineage.canonicalName === 'Activations' ? { activated: { operator: 'equals', value: true } } : lineage.canonicalName === 'Sales' ? { sale: { operator: 'equals', value: true } } : {}}
        />
      )}
      <MetricLineageDrawer`);

fs.writeFileSync('src/components/KpiCard.tsx', content);
