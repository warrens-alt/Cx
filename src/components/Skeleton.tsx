import React from 'react';

export function Skeleton({ className = '', style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`animate-pulse bg-border-subtle rounded ${className}`} style={style} {...props} />
  );
}

export function ChartSkeleton() {
  return (
    <div className="enterprise-card p-6 h-[400px] flex flex-col">
      <Skeleton className="h-4 w-1/4 mb-8" />
      <div className="flex-1 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="enterprise-card overflow-hidden">
      <div className="bg-surface-sec p-4 border-b border-border-strong flex gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
