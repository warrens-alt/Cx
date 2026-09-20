import fs from 'fs';

let content = fs.readFileSync('src/lib/LeadsModal.tsx', 'utf8');

const newRender = `
  const [page, setPage] = React.useState(1);
  const rowsPerPage = 20;

  const totalPages = data ? Math.ceil(data.length / rowsPerPage) : 0;
  const paginatedData = data ? data.slice((page - 1) * rowsPerPage, page * rowsPerPage) : [];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500 mt-1">Showing sample leads for this segment.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-50 p-6 flex flex-col">
            {loading ? (
              <div className="flex justify-center py-12 text-slate-500 animate-pulse">Loading leads...</div>
            ) : error ? (
              <div className="text-rose-500 p-4 bg-rose-50 rounded-lg">{error}</div>
            ) : data && data.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-sm text-left relative">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 bg-slate-50 border-b border-slate-200">Lead ID</th>
                        <th className="px-6 py-4 bg-slate-50 border-b border-slate-200">Vendor</th>
                        <th className="px-6 py-4 bg-slate-50 border-b border-slate-200">Fetched Date</th>
                        <th className="px-6 py-4 bg-slate-50 border-b border-slate-200">Status</th>
                        <th className="px-6 py-4 text-right bg-slate-50 border-b border-slate-200">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.map((lead, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">{lead.lead_id || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                              {lead.vendor || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {lead.fetched ? new Date(lead.fetched.value || lead.fetched).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {lead.sales > 0 ? (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-medium">Sale</span>
                            ) : lead.answered_calls > 0 ? (
                              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">Answered</span>
                            ) : lead.first_call_date ? (
                              <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-xs font-medium">Dialed</span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">Untouched</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
                    <span className="text-sm text-slate-500">
                      Showing <span className="font-medium text-slate-900">{((page - 1) * rowsPerPage) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * rowsPerPage, data.length)}</span> of <span className="font-medium text-slate-900">{data.length}</span> leads
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
                No leads found for this segment.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}`;

content = content.replace(/  if \(!isOpen\) return null;\n\n  return \([\s\S]*\);\n\}/, newRender);

// Need to reset page when modal opens? Or when data changes.
// Using useEffect to reset page.
if (!content.includes('React.useEffect(() => { setPage(1); }, [data]);')) {
  content = content.replace("  const totalPages =", "  React.useEffect(() => { setPage(1); }, [data]);\n  const totalPages =");
}

fs.writeFileSync('src/lib/LeadsModal.tsx', content);
