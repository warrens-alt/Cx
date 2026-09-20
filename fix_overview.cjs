const fs = require('fs');
let code = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

// Imports
code = code.replace(
  /import React, \{ useState, useEffect \} from 'react';/g,
  "import React, { useState, useEffect } from 'react';\nimport PageHeader from '../components/PageHeader';\nimport KpiCard from '../components/KpiCard';\nimport { ChartSkeleton, Skeleton } from '../components/Skeleton';"
);

// We need to replace the custom KPICard in Overview.tsx with the generic one
// First, let's remove the inline KPICard definition if it exists
code = code.replace(/function KPICard\(\{[\s\S]*?return \([\s\S]*?\n\}\n/m, '');

// Now fix the usage of KPICard -> KpiCard
code = code.replace(/<KPICard /g, '<KpiCard ');

// Update the main container and header
code = code.replace(
  /<div className="p-8 pb-20 max-w-\[1600px\] mx-auto">[\s\S]*?<div className="mb-8">[\s\S]*?<\/div>/m,
  `<div className="p-8 pb-20 max-w-[1600px] mx-auto fade-in">
      <PageHeader 
        title="Executive Overview" 
        description="Real-time aggregate performance across all active channels." 
      />`
);

// Replace "bg-card-bg p-6 rounded-xl border border-slate-200 shadow-sm" with "enterprise-card p-6"
code = code.replace(/bg-card-bg p-6 rounded-xl border border-slate-200 shadow-sm/g, 'enterprise-card p-6');

// Replace "text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider" with "text-section-title mb-4"
code = code.replace(/text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider/g, 'text-section-title mb-5');

// Update chart titles
code = code.replace(/text-base font-semibold text-primary-text/g, 'text-[16px] font-semibold text-text-main');
code = code.replace(/border border-slate-200 rounded-md px-3 py-1\.5 bg-slate-50 text-sm text-slate-700 outline-none focus:border-teal transition-colors/g, 'border border-border-subtle rounded-md px-3 py-1.5 bg-surface-sec text-[13px] font-medium text-text-main outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-all cursor-pointer');

// Fix loader
code = code.replace(
  /<Loader2 className="w-8 h-8 animate-spin text-teal" \/>/g,
  `<div className="w-full"><PageHeader title="Executive Overview" /><div className="grid grid-cols-4 gap-4 mb-8"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><ChartSkeleton /></div>`
);

fs.writeFileSync('src/pages/Overview.tsx', code);
