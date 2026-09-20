import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from 'recharts';

interface ScatterPlotProps {
  title: string;
  subtitle?: string;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  data: any[];
  xKey: string;
  yKey: string;
  zKey?: string;
  nameKey: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

export function ScatterPlot({ 
  title, 
  subtitle, 
  data, 
  xKey, 
  yKey, 
  zKey, 
  nameKey, 
  xLabel, 
  yLabel, 
  height = 400 
}: ScatterPlotProps) {
  return (
    <div className="enterprise-card h-full flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-border-subtle bg-surface/50">
        <h3 className="text-base sm:text-lg font-semibold text-text-main">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-text-sec mt-1">{subtitle}</p>}
      </div>
      
      <div className="flex-1 p-6" style={{ minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              dataKey={xKey} 
              name={xLabel || xKey} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="number" 
              dataKey={yKey} 
              name={yLabel || yKey} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            {zKey && <ZAxis type="number" dataKey={zKey} range={[60, 400]} />}
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value, name, props) => {
                if (name === yKey || name === xKey || name === zKey) {
                  return [value, props.payload[nameKey] ? `${props.payload[nameKey]} (${name})` : name];
                }
                return [value, name];
              }}
            />
            <Scatter name="Sources" data={data} fill="#247F7D" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
