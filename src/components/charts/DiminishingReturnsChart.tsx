import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatChartAxis, formatTableNumber } from '../../lib/formatters';
import { ChartToolbar } from './ChartToolbar';

interface DiminishingDataPoint {
  bucket: string;
  volume: number;
  rpcRate?: number;
  saleRate?: number;
  activationRate?: number;
  revPerLead?: number;
  [key: string]: any;
}

interface DiminishingReturnsChartProps {
  title: string;
  subtitle?: string;
  data: DiminishingDataPoint[];
  volumeKey?: string;
  volumeName?: string;
  primaryLineKey?: string;
  primaryLineName?: string;
  secondaryLineKey?: string;
  secondaryLineName?: string;
  benchmarkThreshold?: number;
  benchmarkLabel?: string;
  height?: number;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
}

export function DiminishingReturnsChart({
  title,
  subtitle,
  data,
  volumeKey = 'current',
  volumeName = 'Records in Band',
  primaryLineKey = 'rpc',
  primaryLineName = 'RPC Flag Share (%)',
  secondaryLineKey = 'sale',
  secondaryLineName = 'Sale Flag Share (%)',
  benchmarkThreshold,
  benchmarkLabel = 'Yield Benchmark',
  height = 360,
  auditTitle,
  auditContext,
  auditGrain
}: DiminishingReturnsChartProps) {
  return (
    <div className="enterprise-card p-5 flex flex-col h-full w-full">
      <ChartToolbar visualData={data}
        title={title} 
        subtitle={subtitle} 
        auditTitle={auditTitle} 
        auditContext={auditContext} 
        auditGrain={auditGrain} 
      />

      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
          <ComposedChart data={data} margin={{ top: 20, right: 25, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="bucket" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              dy={10}
            />
            
            <YAxis 
              yAxisId="left" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              tickFormatter={(val) => formatChartAxis(val)}
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              tickFormatter={(val) => `${val}%`}
              domain={[0, (dataMax: number) => Math.min(100, Math.ceil(dataMax * 1.25))]}
            />
            
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '10px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                backgroundColor: '#ffffff',
                padding: '10px 14px'
              }}
              labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              formatter={(value: any, name: string) => {
                if (name === volumeName) return [formatTableNumber(Number(value)), name];
                return [`${Number(value).toFixed(1)}%`, name];
              }}
            />
            
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />

            {benchmarkThreshold !== undefined && (
              <ReferenceLine 
                yAxisId="right" 
                y={benchmarkThreshold} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                label={{ 
                  value: benchmarkLabel, 
                  position: 'insideTopRight', 
                  fill: '#ef4444', 
                  fontSize: 11,
                  fontWeight: 500
                }} 
              />
            )}

            <Bar 
              yAxisId="left" 
              dataKey={volumeKey} 
              name={volumeName} 
              fill="#0F1E2E" 
              radius={[6, 6, 0, 0]} 
              isAnimationActive={false}
              maxBarSize={48}
            />

            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey={primaryLineKey} 
              name={primaryLineName} 
              stroke="#0D9488" 
              strokeWidth={2.5} 
              dot={{ r: 4, fill: '#0D9488', strokeWidth: 2, stroke: '#ffffff' }} 
              activeDot={{ r: 6 }} 
              isAnimationActive={false} 
            />

            {secondaryLineKey && (
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey={secondaryLineKey} 
                name={secondaryLineName} 
                stroke="#D97706" 
                strokeWidth={2} 
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#D97706', strokeWidth: 2, stroke: '#ffffff' }} 
                activeDot={{ r: 5 }} 
                isAnimationActive={false} 
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
