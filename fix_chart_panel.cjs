const fs = require('fs');
let content = fs.readFileSync('src/components/ChartPanel.tsx', 'utf8');

content = `import DataAuditDrawer from './DataAuditDrawer';\nimport { Table as TableIcon } from 'lucide-react';\nimport { useState } from 'react';\n` + content;
content = content.replace(/interface Props \{/, `interface Props {\n  auditTitle?: string;\n  auditContext?: any;\n  auditGrain?: string;`);
content = content.replace(/export function ChartPanel\(\{ title, subtitle, controls, children, footer \}: Props\) \{/, 
  `export function ChartPanel({ title, subtitle, controls, children, footer, auditTitle, auditContext, auditGrain }: Props) {\n  const [auditOpen, setAuditOpen] = useState(false);`);

content = content.replace(/\{controls && \(/, `{auditTitle && (
            <button onClick={() => setAuditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-sec bg-surface border border-border-subtle rounded hover:bg-slate-50 transition-colors shrink-0">
              <TableIcon className="w-3.5 h-3.5" />
              View Data
            </button>
          )}
          {controls && (`);

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

fs.writeFileSync('src/components/ChartPanel.tsx', content);
