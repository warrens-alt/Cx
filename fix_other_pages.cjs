const fs = require('fs');

function replaceWithKpi(file, replaces) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import KpiCard")) {
    content = content.replace("import { Loader2 } from 'lucide-react';", "import { Loader2 } from 'lucide-react';\nimport KpiCard from '../components/KpiCard';");
    content = content.replace("import { TableSkeleton } from '../components/Skeleton';", "import { TableSkeleton } from '../components/Skeleton';\nimport KpiCard from '../components/KpiCard';");
  }

  for (let r of replaces) {
    content = content.replace(r.from, r.to);
  }
  fs.writeFileSync(file, content);
}

replaceWithKpi('src/pages/DataCoverage.tsx', [
  {
    from: /<div className="enterprise-card p-6 border-l-4 border-l-teal">[\s\S]*?<\/div>\s*<\/div>/g,
    to: `<KpiCard title="Mapped Parameters" value={paramData.summary.mapped + " / " + paramData.summary.totalRequired} subtitle="Core Fields Mapped" />
        <KpiCard title="Coverage Density" value={paramData.summary.coveragePercent} suffix="%" subtitle="Data Completeness" />
        <KpiCard title="Total Sources" value={totalCount} subtitle="Active Data Sources" />
        <KpiCard title="Source Conflicts" value={paramData.summary.sourceConflicts} subtitle="Requires Resolution" isPositiveGood={false} change={-2} />`
  }
]);

replaceWithKpi('src/pages/Acquisition.tsx', [
  {
    from: /<div className="enterprise-card p-6">[\s\S]*?<\/div>\s*<\/div>/g,
    to: `<KpiCard title="Total Spend" value={Math.round(summary.spend).toLocaleString()} prefix="R" />
        <KpiCard title="Leads Acquired" value={Math.round(summary.leads).toLocaleString()} />
        <KpiCard title="Avg Cost per Lead" value={(summary.cpa || 0).toFixed(2)} prefix="R" isPositiveGood={false} />
        <KpiCard title="Total Impressions" value={Math.round(summary.impressions).toLocaleString()} />`
  }
]);

replaceWithKpi('src/pages/Outcomes.tsx', [
  {
    from: /<div className="enterprise-card p-6 border-l-4 border-l-teal">[\s\S]*?<\/div>\s*<\/div>/g,
    to: `<KpiCard title="Total Activations" value={data.summary.total_activations.toLocaleString()} />
        <KpiCard title="Total Revenue" value={Math.round(data.summary.total_revenue).toLocaleString()} prefix="R" />`
  }
]);

