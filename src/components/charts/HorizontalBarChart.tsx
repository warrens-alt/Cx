import React from 'react';
import { formatChartAxis } from '../../lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartToolbar } from './ChartToolbar';

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  data: any[];
  categoryKey: string;
  valueKey: string;
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
  color?: string;
}

export function HorizontalBarChart({
  title,
  subtitle,
  data,
  categoryKey,
  valueKey,
  valuePrefix = '',
  valueSuffix = '',
  height = 300,
  color = '#0F1E2E',
  auditTitle,
  auditContext,
  auditGrain
}: HorizontalBarChartProps) {
  
  const formatValue = (val: number) => {
    return `${valuePrefix}${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}${valueSuffix}`;
  };

  return (
    <div className="enterprise-card p-5 flex flex-col h-full w-full">
      <ChartToolbar visualData={data} title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain} />
      
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis 
              type="number"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              tickFormatter={(val) => `${valuePrefix}${formatChartAxis(val)}${valueSuffix}`}
            />
            <YAxis 
              type="category"
              dataKey={categoryKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }} 
              width={135}
            />
            <RechartsTooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)', backgroundColor: '#ffffff', padding: '10px 14px' }}
              labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              formatter={(value: any) => [formatValue(Number(value)), 'Value']}
            />
            <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
