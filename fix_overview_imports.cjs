const fs = require('fs');
let content = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

// The original Overview used:
// import { useAnalyticsData } from '../lib/useAnalyticsData';
// const { data, metadata, loading } = useAnalyticsData('overview');

content = content.replace(
  /import \{ useQuery \} from '@tanstack\/react-query';\nimport \{ PageHeader \} from '\.\.\/components\/PageHeader';\nimport \{ KpiCard \} from '\.\.\/components\/KpiCard';\nimport \{ Skeleton \} from '\.\.\/components\/Skeleton';\nimport \{ EmptyState \} from '\.\.\/components\/EmptyState';\nimport \{ fetchAnalyticsOverview \} from '\.\.\/lib\/api';\nimport \{ useFilterContext \} from '\.\.\/lib\/FilterContext';/g,
  `import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useAnalyticsData } from '../lib/useAnalyticsData';`
);

content = content.replace(
  /export default function Overview\(\) \{\n  const \{ filters \} = useFilterContext\(\);\n  const \[trendMetric, setTrendMetric\] = useState\('leads'\);\n\n  const \{ data, isLoading \} = useQuery\(\{\n    queryKey: \['analytics-overview', filters\],\n    queryFn: \(\) => fetchAnalyticsOverview\(filters\),\n    staleTime: 5 \* 60 \* 1000,\n  \}\);/g,
  `export default function Overview() {
  const [trendMetric, setTrendMetric] = useState('leads');
  const { data: rawData, metadata, loading: isLoading } = useAnalyticsData('overview');
  const data = rawData as any || {};`
);

content = content.replace(/if \(!data\?\.metrics\)/g, `if (!data)`);
content = content.replace(/const m = data\.metrics;/g, `const m = data;`);

fs.writeFileSync('src/pages/Overview.tsx', content);
