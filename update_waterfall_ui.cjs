const fs = require('fs');
let code = fs.readFileSync('src/pages/PipelineWaterfall.tsx', 'utf8');

// Replace the Recharts imports
code = code.replace(
  /import \{ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend \} from 'recharts';/,
  "import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';"
);

const newChartData = `
  const chartData = data.waterfall.map((item, index) => {
    let conversionRate = 0;
    if (index > 0 && data.waterfall[index - 1].sustainedVolume > 0) {
      conversionRate = (item.sustainedVolume / data.waterfall[index - 1].sustainedVolume) * 100;
    } else if (index === 0) {
      conversionRate = 100;
    }
    return {
      name: item.stage,
      sustained: item.sustainedVolume,
      lost: item.volumeDecayed,
      capitalLost: item.capitalDecay,
      conversionRate: Number(conversionRate.toFixed(1)),
      isFirst: index === 0
    };
  });
`;

code = code.replace(
  /const chartData = data\.waterfall\.map\(\(item, index\) => \(\{[\s\S]*?isFirst: index === 0\s*\}\)\);/m,
  newChartData.trim()
);

const newChart = `
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
              <YAxis yAxisId="left" tickFormatter={(val) => formatNumber(val)} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => \`\${val}%\`} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const sustained = payload.find(p => p.dataKey === 'sustained');
                    const lost = payload.find(p => p.dataKey === 'lost');
                    const conversion = payload.find(p => p.dataKey === 'conversionRate');
                    return (
                      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-lg text-sm min-w-[240px]">
                        <p className="font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</p>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Sustained</span>
                          <span className="font-medium text-slate-900">{formatNumber(sustained?.value)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Stage Conversion</span>
                          <span className="font-medium text-emerald-600">{conversion?.value}%</span>
                        </div>
                        {lost && lost.value > 0 && (
                          <>
                            <div className="flex justify-between items-center mb-2 mt-3 pt-3 border-t border-slate-100">
                              <span className="text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Volume Lost</span>
                              <span className="font-medium text-rose-600">-{formatNumber(lost.value)}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center bg-rose-50/50 -mx-4 -mb-4 p-3 rounded-b-lg">
                              <span className="text-rose-700 font-medium text-xs uppercase tracking-wide">Capital Decay</span>
                              <span className="font-bold text-rose-700">{formatCurrency(lost.payload.capitalLost)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar yAxisId="left" dataKey="sustained" name="Sustained Volume" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar yAxisId="left" dataKey="lost" name="Volume Lost" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Stage Conversion %" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
`;

code = code.replace(
  /<BarChart data=\{chartData\} margin=\{\{ top: 20, right: 30, left: 20, bottom: 60 \}\}>[\s\S]*?<\/BarChart>/,
  newChart.trim()
);

fs.writeFileSync('src/pages/PipelineWaterfall.tsx', code);
