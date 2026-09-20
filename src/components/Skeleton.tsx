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
          <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${[40,65,48,82,56,70,90,68,74,52,86,62][i]}%` }} />
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

export function PageSkeleton(){
  return <div className="cx-page" role="status" aria-label="Loading page"><span className="sr-only">Loading analytical page…</span>
    <div aria-hidden="true"><Skeleton className="h-8 w-64 mb-3"/><Skeleton className="h-4 w-full max-w-xl mb-8"/>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{[0,1,2,3].map(i=><div key={i} className="enterprise-card p-6"><Skeleton className="h-4 w-3/4 mb-5"/><Skeleton className="h-9 w-1/2"/></div>)}</div><ChartSkeleton/></div>
  </div>;
}
