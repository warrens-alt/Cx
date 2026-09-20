const fs = require('fs');
let content = fs.readFileSync('src/pages/CallPerformance.tsx', 'utf8');

content = content.replace(
  /import \{ ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend \} from 'recharts';/g,
  `import PageHeader from '../components/PageHeader';\nimport { DistributionBar } from '../components/charts/DistributionBar';`
);

content = content.replace(
  /<div>\n        <h1 className="text-page-title">Call Performance<\/h1>\n        <p className="text-secondary-text text-sm mt-1">Analyse contact strategies and calls per lead distribution\.<\/p>\n      <\/div>/g,
  `<PageHeader title="Call Performance" description="Analyse contact strategies and calls per lead distribution." />`
);

content = content.replace(
  /<div className="enterprise-card p-6 mb-8">[\s\S]*?<\/div>(\s*<div className="overflow-x-auto border border-slate-200 rounded-lg">[\s\S]*?<\/div>\s*<\/div>)/,
  `<div className="h-[450px]">
        <DistributionBar 
          title="Calls per Lead Distribution" 
          subtitle="Distribution of leads across call attempt buckets."
          data={callsData.chart}
          bucketKey="bucket"
          valueKey="current"
          height={400}
        />
      </div>$1`
);

fs.writeFileSync('src/pages/CallPerformance.tsx', content);
