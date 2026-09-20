import fs from 'fs';

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Replace TablePreview
const newTablePreview = `function TablePreview({ value }: { value: SettingSelection }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (value.projectId && value.datasetId && value.tableId) {
      setLoading(true);
      setError('');
      fetch(\`/api/bq/preview?projectId=\${value.projectId}&datasetId=\${value.datasetId}&tableId=\${value.tableId}\`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setData(d.data || []);
            setPage(1);
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

  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">null</span>;
    if (typeof val === 'boolean') return <span className={\`px-2 py-0.5 rounded text-xs font-medium \${val ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}\`}>{val.toString()}</span>;
    if (typeof val === 'object') {
      if (val.value) return String(val.value); // Handle BQ date/time objects
      const str = JSON.stringify(val);
      if (str.length > 50) {
        return (
          <div className="max-w-xs truncate" title={str}>
            <span className="font-mono text-xs text-indigo-600">{str}</span>
          </div>
        );
      }
      return <span className="font-mono text-xs text-indigo-600">{str}</span>;
    }
    return String(val);
  };

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const paginatedData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  // Get all unique keys from all rows (in case some rows are missing keys)
  const allKeys = Array.from(new Set(data.flatMap(row => Object.keys(row))));

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Table Preview</h3>
        {!loading && !error && data.length > 0 && (
          <div className="text-sm text-slate-500">
            Showing {Math.min(data.length, 50)} sample rows
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <span className="text-slate-500 font-medium">Querying BigQuery...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <div className="whitespace-pre-wrap font-mono text-xs">{error}</div>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
          No data available in this table.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  {allKeys.map((key) => (
                    <th key={key} className="px-4 py-3 font-semibold whitespace-nowrap border-b border-slate-200 bg-slate-50">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((row, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                    {allKeys.map((key, j) => (
                      <td key={j} className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {renderCellValue(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-500">
                Page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}`;

content = content.replace(/function TablePreview\(\{ value \}: \{ value: SettingSelection \}\) \{[\s\S]*?\n\}/, newTablePreview);

fs.writeFileSync('src/pages/Settings.tsx', content);
