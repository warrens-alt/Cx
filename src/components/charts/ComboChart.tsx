import React from 'react';
import { formatChartAxis } from '../../lib/formatters';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ChartToolbar } from './ChartToolbar';

interface ComboChartProps {
  title: string;
  subtitle?: string;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  data: any[];
  xKey: string;
  barKey: string;
  lineKey: string;
  barName?: string;
  lineName?: string;
  barColor?: string;
  lineColor?: string;
  height?: number;
}

export function ComboChart({
  title,
  subtitle,
  data,
  xKey,
  barKey,
  lineKey,
  barName,
  lineName,
  barColor = '#18364F',
  lineColor = '#247F7D',
  height = 350
, auditTitle, auditContext, auditGrain }: ComboChartProps) {
  
  return (
    <div className="enterprise-card p-5 flex flex-col h-full w-full">
      <ChartToolbar visualData={data} title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain} />
      
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
          <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey={xKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              dy={10}
            />
            <YAxis yAxisId="left" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={(val) => formatChartAxis(val)}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={(val) => `${formatChartAxis(val)}%`}
            />
            <RechartsTooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            <Bar yAxisId="left" dataKey={barKey} name={barName || barKey} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColor} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey={lineKey} name={lineName || lineKey} stroke={lineColor} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
