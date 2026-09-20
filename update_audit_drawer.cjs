const fs = require('fs');

let drawerTs = fs.readFileSync('src/components/DataAuditDrawer.tsx', 'utf8');

// Replace the generic table mapping with column groups

const newCode = `
  const [activeGroups, setActiveGroups] = useState<string[]>(['Lead', 'Quality', 'Outcomes', 'HLC 1']);

  const getColumnGroup = (key: string) => {
    if (key.match(/^hlc_(\\d+)_/)) {
      const num = key.match(/^hlc_(\\d+)_/)[1];
      return \`HLC \${num}\`;
    }
    if (['lead_id', 'consumer_id', 'capture_date', 'capture_timestamp', 'source', 'medium'].includes(key)) return 'Lead';
    if (['valid_lead', 'valid_idno', 'phone_valid', 'grade', 'vetting', 'sentinel_capture'].includes(key)) return 'Quality';
    if (['has_delivery', 'has_call', 'has_rpc', 'has_sale', 'has_activation', 'total_calls', 'first_call_timestamp', 'last_call_timestamp', 'total_revenue'].includes(key)) return 'Outcomes';
    return 'Other';
  };

  const allGroups = Array.from(new Set(data.length > 0 ? Object.keys(data[0]).map(getColumnGroup) : []));

  const toggleGroup = (grp: string) => {
    setActiveGroups(prev => prev.includes(grp) ? prev.filter(g => g !== grp) : [...prev, grp]);
  };
`;

drawerTs = drawerTs.replace(/const \[grain, setGrain\] = useState\(defaultGrain\);/, `const [grain, setGrain] = useState(defaultGrain);\n${newCode}`);

// Replace the thead and tbody logic
const newTableCode = `
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-text-mute flex items-center mr-2">COLUMN GROUPS:</span>
                {allGroups.map(grp => (
                  <button 
                    key={grp}
                    onClick={() => toggleGroup(grp)}
                    className={\`px-2 py-1 text-xs rounded-md font-medium transition-colors \${activeGroups.includes(grp) ? 'bg-teal text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}\`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
              <div className="bg-white border rounded-lg shadow-sm overflow-auto max-h-full">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    {Object.keys(data[0]).filter(k => activeGroups.includes(getColumnGroup(k))).map(key => (
                      <th key={key} className="p-3 font-semibold text-text-sec border-b">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      {Object.entries(row).filter(([k]) => activeGroups.includes(getColumnGroup(k))).map(([k, val]: any, j) => (
                        <td key={j} className="p-3 text-text-main">
                          {val === null ? <span className="text-slate-300 italic">null</span> :
                           typeof val === 'boolean' ? (val ? 'True' : 'False') :
                           String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
`;

drawerTs = drawerTs.replace(/<div className="bg-white border rounded-lg shadow-sm overflow-auto max-h-full">[\s\S]*?<\/table>/, newTableCode);

fs.writeFileSync('src/components/DataAuditDrawer.tsx', drawerTs);
