const fs = require('fs');
let code = fs.readFileSync('src/pages/Acquisition.tsx', 'utf8');

const regex = /<\/div>\n    <\/div>\n  \);\n\}/m;

const replacement = `      </div>

      <div className="bg-card-bg rounded-xl border border-slate-200 shadow-sm mt-8">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-base font-semibold text-primary-text">Campaign Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Campaign</th>
                <th className="px-6 py-3">Channel</th>
                <th className="px-6 py-3 text-right">Spend</th>
                <th className="px-6 py-3 text-right">Impressions</th>
                <th className="px-6 py-3 text-right">Clicks</th>
                <th className="px-6 py-3 text-right">CTR</th>
                <th className="px-6 py-3 text-right">CPC</th>
                <th className="px-6 py-3 text-right">Leads</th>
                <th className="px-6 py-3 text-right">CPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(data.campaigns || []).map((c: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{c.campaign}</td>
                  <td className="px-6 py-4 text-slate-500">{c.channel}</td>
                  <td className="px-6 py-4 text-right">R{c.spend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="px-6 py-4 text-right">{c.impressions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{c.clicks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{c.ctr.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right">R{c.cpc.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">{c.leads.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">R{c.cpa.toFixed(2)}</td>
                </tr>
              ))}
              {(!data.campaigns || data.campaigns.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">No campaigns found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Acquisition.tsx', code);
