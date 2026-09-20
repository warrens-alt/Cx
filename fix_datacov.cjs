const fs = require('fs');

let file = fs.readFileSync('src/pages/DataCoverage.tsx', 'utf8');
const replacement = `<KpiCard title="Parameters Mapped" value={paramData.summary.mapped + " / " + paramData.summary.totalRequired} />
        <KpiCard title="Parameter Coverage" value={paramData.summary.coveragePercent} suffix="%" />
        <KpiCard title="Tables Scanned" value={totalCount} />
        <KpiCard title="Source Conflicts" value={paramData.summary.sourceConflicts} isPositiveGood={false} />`;

file = file.replace(/<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-\[1440px\]:grid-cols-5 min-\[1920px\]:grid-cols-6 gap-4">[\s\S]*?<\/div>\s*<div className="enterprise-card overflow-hidden">/, 
`<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 gap-4">
        ${replacement}
      </div>
      <div className="enterprise-card overflow-hidden">`);

fs.writeFileSync('src/pages/DataCoverage.tsx', file);
