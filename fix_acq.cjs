const fs = require('fs');
let content = fs.readFileSync('src/pages/Acquisition.tsx', 'utf8');

content = content.replace(
  /import \{ AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer \} from 'recharts';/g,
  `import PageHeader from '../components/PageHeader';\nimport { TrendChart } from '../components/charts/TrendChart';`
);

content = content.replace(
  /<div>\n        <h1 className="text-page-title">Acquisition Performance<\/h1>\n        <p className="text-secondary-text text-sm mt-1">Marketing spend, impressions, clicks and lead attribution\.<\/p>\n      <\/div>/g,
  `<PageHeader title="Acquisition Performance" description="Marketing spend, impressions, clicks and lead attribution." />`
);

content = content.replace(
  /<div className="enterprise-card p-6 h-\[400px\]">[\s\S]*?<\/div>/,
  `<div className="h-[400px]">
        <TrendChart 
          title="Spend vs Leads (Daily)" 
          subtitle="Trend of marketing expenditure and lead volume."
          data={chartData}
          dateKey="date"
          seriesKey="spend"
          seriesName="Spend"
          isCurrency={true}
        />
      </div>`
);

fs.writeFileSync('src/pages/Acquisition.tsx', content);
