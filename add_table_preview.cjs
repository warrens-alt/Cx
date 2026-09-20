const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const tablePreviewComponent = `
function TablePreview({ value }: { value: SettingSelection }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (value.projectId && value.datasetId && value.tableId) {
      setLoading(true);
      setError('');
      fetch(\`/api/bq/preview?projectId=\${value.projectId}&datasetId=\${value.datasetId}&tableId=\${value.tableId}\`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setData(d.data || []);
          } else {
            setError(d.error || 'Failed to load preview');
          }
          setLoading(false);
        })
        .catch(e => {
          setError(e.message);
          setLoading(false);
        });
    } else {
      setData([]);
      setError('');
    }
  }, [value.projectId, value.datasetId, value.tableId]);

  if (!value.projectId || !value.datasetId || !value.tableId) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Table Preview</h3>
      {loading ? (
        <div className="flex items-center justify-center p-8 bg-slate-50 rounded-lg border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-slate-500">Loading preview...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm">
          No data available in this table.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key} className="px-4 py-3 font-semibold whitespace-nowrap">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {Object.values(row).map((val: any, j) => (
                    <td key={j} className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {val === null ? <span className="text-slate-400 italic">null</span> : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
`;

if (!code.includes('TablePreview')) {
  // Append TablePreview at the end
  code += "\n\n" + tablePreviewComponent.trim() + "\n";
  
  // Add TablePreview call to SettingsForm
  code = code.replace(
    '</select>\n          {loadingTables && (\n            <div className="absolute right-3 top-3">\n              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />\n            </div>\n          )}\n        </div>\n      </div>\n    </div>',
    '</select>\n          {loadingTables && (\n            <div className="absolute right-3 top-3">\n              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />\n            </div>\n          )}\n        </div>\n      </div>\n\n      <TablePreview value={value} />\n    </div>'
  );

  fs.writeFileSync('src/pages/Settings.tsx', code);
}
