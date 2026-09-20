import React from 'react';
import { formatKpiValue, formatChartAxis } from '../../lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartToolbar } from './ChartToolbar';

interface DistributionBarProps {
  title: string;
  subtitle?: string;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  data: any[];
  bucketKey: string;
  valueKey: string;
  height?: number;
  color?: string;
  formatValue?: (val: number) => string;
}

export function DistributionBar({
  title,
  subtitle,
  data,
  bucketKey,
  valueKey,
  height = 250,
  color = '#18364F',
  formatValue
, auditTitle, auditContext, auditGrain }: DistributionBarProps) {
  
  const defaultFormat = (val: number) => formatKpiValue(val);
  const formatter = formatValue || defaultFormat;

  return (
    <div className="enterprise-card p-5 flex flex-col h-full w-full">
      <ChartToolbar title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain} />
      
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
          <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey={bucketKey}
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              dy={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => formatChartAxis(val)}
            />
            <RechartsTooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}
              formatter={(value: any) => [formatter(Number(value)), 'Leads']}
            />
            <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
              <LabelList dataKey={valueKey} position="top" formatter={formatter} style={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
