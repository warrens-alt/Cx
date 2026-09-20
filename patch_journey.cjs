const fs = require('fs');
let content = fs.readFileSync('src/pages/UserJourney.tsx', 'utf8');

const tableHtml = `
              <div className="flex-1 overflow-y-auto p-8">
                {selectedLead.hlc_details && selectedLead.hlc_details.length > 0 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">HLC Details</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {Object.keys(selectedLead.hlc_details[0]).map(key => (
                              <th key={key} className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">
                                {key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {selectedLead.hlc_details.map((hlc, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              {Object.keys(selectedLead.hlc_details[0]).map(key => (
                                <td key={key} className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                  {hlc[key] !== null && hlc[key] !== undefined ? String(hlc[key]) : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Journey Timeline</h3>
                </div>
                <div className="relative">`;

content = content.replace(
  '<div className="flex-1 overflow-y-auto p-8">\n                <div className="relative">',
  tableHtml
);

fs.writeFileSync('src/pages/UserJourney.tsx', content);
