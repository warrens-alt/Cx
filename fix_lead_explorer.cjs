const fs = require('fs');
let content = fs.readFileSync('src/pages/LeadExplorer.tsx', 'utf8');

if (!content.includes('handleExport')) {
  content = `import { Download } from 'lucide-react';\n` + content;
  content = content.replace(/const \[data, setData\] = useState<any\[\]>\(\[\]\);/, `const [data, setData] = useState<any[]>([]);\n  
  const handleExport = () => {
    const params = new URLSearchParams({
      clientId: selectedClient || 'default',
      grain: 'lead',
      format: 'csv'
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (filters && Object.keys(filters).length > 0) {
      params.append('filters', JSON.stringify(filters));
    }
    
    window.open('/api/analytics/export?' + params.toString(), '_blank');
  };`);
  
  content = content.replace(/<div className="flex items-center gap-2">/, `<div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-border-strong rounded hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Export Full Dataset
            </button>`);
  
  fs.writeFileSync('src/pages/LeadExplorer.tsx', content);
}
