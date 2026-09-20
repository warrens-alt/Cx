const fs = require('fs');

let coverageTsx = fs.readFileSync('src/pages/DataCoverage.tsx', 'utf8');

// Add state for hlcCoverage
coverageTsx = coverageTsx.replace(
  /const \[paramData, setParamData\] = useState<any>\(null\);/,
  `const [paramData, setParamData] = useState<any>(null);
  const [hlcCoverage, setHlcCoverage] = useState<any[]>([]);`
);

// Add fetch
coverageTsx = coverageTsx.replace(
  /fetch\('\/api\/analytics\/parameter-coverage'\).then\(r => r.json\(\)\)/,
  `fetch('/api/analytics/parameter-coverage').then(r => r.json()),
      fetch('/api/analytics/hlc-coverage').then(r => r.json())`
);

// Resolve fetch
coverageTsx = coverageTsx.replace(
  /\.then\(\(\[tData, pData\]\) => \{/,
  `.then(([tData, pData, hData]) => {`
);

coverageTsx = coverageTsx.replace(
  /if \(pData\.success\) setParamData\(pData\.data\);/,
  `if (pData.success) setParamData(pData.data);
      if (hData && hData.success) setHlcCoverage(hData.data);`
);

// Render the widget at the end
const widget = `
      <div className="enterprise-card overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
          <h2 className="font-semibold text-text-main">HLC Vendor Field Coverage</h2>
          <p className="text-xs text-text-sec mt-1">Completeness of analytical fields partitioned by HLC Vendor.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th className="text-right">Transactions</th>
                <th className="text-right">Status</th>
                <th className="text-right">Delivery</th>
                <th className="text-right">1st Call</th>
                <th className="text-right">Last Call</th>
                <th className="text-right">Disposition</th>
                <th className="text-right">RPC</th>
                <th className="text-right">Sale</th>
                <th className="text-right">Activation</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {hlcCoverage.map((d: any, i: number) => {
                const pct = (val: number) => (val * 100).toFixed(1) + '%';
                const getColor = (val: number) => val > 0.9 ? 'text-emerald-600 font-medium' : val > 0.5 ? 'text-amber-600' : 'text-slate-400';
                return (
                  <tr key={i} className="hover:bg-surface-sec">
                    <td className="font-medium text-text-main">{d.vendor || 'Unknown'}</td>
                    <td className="text-right">{Number(d.total_transactions).toLocaleString()}</td>
                    <td className={"text-right " + getColor(d.coverage_status)}>{pct(d.coverage_status)}</td>
                    <td className={"text-right " + getColor(d.coverage_delivery)}>{pct(d.coverage_delivery)}</td>
                    <td className={"text-right " + getColor(d.coverage_first_call)}>{pct(d.coverage_first_call)}</td>
                    <td className={"text-right " + getColor(d.coverage_last_call)}>{pct(d.coverage_last_call)}</td>
                    <td className={"text-right " + getColor(d.coverage_disposition)}>{pct(d.coverage_disposition)}</td>
                    <td className={"text-right " + getColor(d.coverage_rpc)}>{pct(d.coverage_rpc)}</td>
                    <td className={"text-right " + getColor(d.coverage_sale)}>{pct(d.coverage_sale)}</td>
                    <td className={"text-right " + getColor(d.coverage_activation)}>{pct(d.coverage_activation)}</td>
                    <td className={"text-right " + getColor(d.coverage_revenue)}>{pct(d.coverage_revenue)}</td>
                  </tr>
                );
              })}
              {hlcCoverage.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-text-mute italic">No HLC vendor data available for the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
`;

coverageTsx = coverageTsx.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/,
  `</div>\n      </div>\n      ${widget}\n    </div>\n  );\n}`
);

fs.writeFileSync('src/pages/DataCoverage.tsx', coverageTsx);
