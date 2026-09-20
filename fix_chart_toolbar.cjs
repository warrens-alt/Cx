const fs = require('fs');
let content = fs.readFileSync('src/components/charts/ChartToolbar.tsx', 'utf8');

content = `import DataAuditDrawer from '../DataAuditDrawer';\nimport { Table as TableIcon } from 'lucide-react';\nimport { useState } from 'react';\n` + content;
content = content.replace(/children\?: React\.ReactNode;\n\}/, `children?: React.ReactNode;\n  auditTitle?: string;\n  auditContext?: any;\n  auditGrain?: string;\n}`);
content = content.replace(/export function ChartToolbar\(\{/, `export function ChartToolbar({\n  auditTitle,\n  auditContext,\n  auditGrain,`);

content = content.replace(/<div className="flex items-center gap-1 border-l border-border-subtle pl-2 ml-2">/, 
  `{auditTitle && (
          <button onClick={() => setAuditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-sec bg-surface border border-border-subtle rounded hover:bg-slate-50 transition-colors shrink-0">
            <TableIcon className="w-3.5 h-3.5" />
            View Data
          </button>
        )}
        <div className="flex items-center gap-1 border-l border-border-subtle pl-2 ml-2">`);

content = content.replace(/return \(/, `const [auditOpen, setAuditOpen] = useState(false);\n  return (`);
content = content.replace(/<\/div>\n    <\/div>\n  \);\n\}/, `</div>
      {auditTitle && (
        <DataAuditDrawer
          isOpen={auditOpen}
          onClose={() => setAuditOpen(false)}
          title={auditTitle}
          contextFilters={auditContext || {}}
          defaultGrain={auditGrain || 'lead'}
        />
      )}
    </div>
  );
}`);

fs.writeFileSync('src/components/charts/ChartToolbar.tsx', content);
