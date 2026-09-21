import React from 'react';
import { formatChartAxis } from '../../lib/formatters';
import { useId } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ChartToolbar } from './ChartToolbar';

interface TrendChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  currentKey: string;
  comparisonKey?: string;
  xAxisKey: string;
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
  options?: { label: string; value: string }[];
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  onOptionChange?: (val: string) => void;
  selectedOption?: string;
}

export function TrendChart({
  title,
  subtitle,
  data,
  currentKey,
  comparisonKey,
  xAxisKey,
  valuePrefix = '',
  valueSuffix = '',
  height = 300,
  options,
  onOptionChange,
  selectedOption,
  auditTitle,
  auditContext,
  auditGrain
}: TrendChartProps) {
  
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const formatValue = (val: number) => {
    return `${valuePrefix}${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}${valueSuffix}`;
  };

  return (
    <div className="enterprise-card p-5 flex flex-col h-full w-full">
      <ChartToolbar visualData={data} title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain}>
        {options && (
          <select 
            value={selectedOption}
            onChange={(e) => onOptionChange?.(e.target.value)}
            className="border border-border-subtle rounded-lg px-3 py-1.5 bg-surface text-xs sm:text-sm font-medium text-text-main outline-none focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all cursor-pointer shadow-2xs"
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </ChartToolbar>
      
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey={xAxisKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              tickFormatter={(val) => formatChartAxis(val)}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              tickFormatter={(val) => `${valuePrefix}${formatChartAxis(val)}${valueSuffix}`}
              dx={-10} 
            />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)', backgroundColor: '#ffffff', padding: '10px 14px' }}
              labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              formatter={(value: any, name: string) => [formatValue(Number(value)), name]}
            />
            
            {comparisonKey && (
              <Area 
                isAnimationActive={false}
                type="monotone" 
                dataKey={comparisonKey} 
                stroke="#94a3b8" 
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none" 
                name="Previous"
              />
            )}
            
            <Area 
              isAnimationActive={false}
              type="monotone" 
              dataKey={currentKey} 
              stroke="#0D9488" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill={`url(#${gradientId})`} 
              name="Current"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
