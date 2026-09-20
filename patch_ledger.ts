import fs from 'fs';

let content = fs.readFileSync('src/pages/LeadLedger.tsx', 'utf8');

const newRender = `  const [page, setPage] = React.useState(1);
  const rowsPerPage = 20;

  if (loading) return <div className="p-8 text-slate-500">Loading lead ledger...</div>;
  if (error) return <div className="p-8 text-rose-500">Error loading data.</div>;
  if (!data) return null;

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const paginatedData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const columns: { header: string; key: keyof LeadLedgerData; type?: 'currency' | 'number' }[] = [
    { header: 'Vendor', key: 'vendor' },
    { header: 'Lead ID', key: 'lead_id' },
    { header: 'Transaction ID', key: 'transaction_id', type: 'number' },
    { header: 'Consumer ID', key: 'consumer_id', type: 'number' },
    { header: 'Source', key: 'offershop_source' },
    { header: 'Vetting Status', key: 'vetting_status' },
    { header: 'Fetched Date', key: 'fetched' },
    { header: 'Vetted Date', key: 'vetted' },
    { header: 'Attempted Delivery', key: 'attempted_to_deliver' },
    { header: 'Delivered', key: 'delivered' },
    { header: 'Expected First Dial', key: 'expected_first_dial' },
    { header: 'New Dialer Lead', key: 'new_dialer_lead', type: 'number' },
    { header: 'First Call', key: 'first_call_date' },
    { header: 'Last Call', key: 'last_call_date' },
    { header: 'Last Dialer Status', key: 'last_dialer_status' },
    { header: 'Last Call Length (s)', key: 'last_call_length_in_sec', type: 'number' },
    { header: 'Total Call Length (s)', key: 'total_calls_length_in_sec', type: 'number' },
    { header: 'Total Calls', key: 'total_calls', type: 'number' },
    { header: 'RPC', key: 'rpc', type: 'number' },
    { header: 'Sale', key: 'sale' },
    { header: 'Activated', key: 'activated' },
    { header: 'Lead Cost', key: 'lead_cost', type: 'currency' },
    { header: 'Revenue', key: 'revenue_generated', type: 'currency' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 max-w-[100vw] mx-auto overflow-x-hidden">
      <div className="mb-8 flex items-center gap-3">
        <Database className="w-8 h-8 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Ledger (Raw Data)</h1>
          <p className="text-slate-500">Viewing sample of 100 recent rows from tbl_offershop_lead_ledger</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-sm text-left text-slate-500 whitespace-nowrap relative">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 font-semibold bg-slate-50 border-b border-slate-200">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, i) => (
                <tr key={i} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {columns.map((col, idx) => {
                    const value = row[col.key];
                    let formattedValue: any = value;
                    if (value === null || value === undefined || value === '1970-01-01 00:00:01') {
                      formattedValue = '-';
                    } else if (col.type === 'currency') {
                      formattedValue = formatCurrency(value as number);
                    } else if (col.type === 'number') {
                      formattedValue = value;
                    }
                    return (
                      <td key={idx} className={\`px-6 py-4 \${col.key === 'lead_id' ? 'font-mono text-slate-900' : ''}\`}>
                        {formattedValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{((page - 1) * rowsPerPage) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * rowsPerPage, data.length)}</span> of <span className="font-medium text-slate-900">{data.length}</span> rows
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
    </motion.div>
  );
`;

content = content.replace(/  if \(loading\) return[\s\S]*\);\n\}/, newRender);

if (!content.includes('import React')) {
  content = content.replace("import { useDataFetch }", "import React from 'react';\nimport { useDataFetch }");
}

fs.writeFileSync('src/pages/LeadLedger.tsx', content);
