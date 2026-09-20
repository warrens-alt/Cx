const fs = require('fs');
let content = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

content = content.replace(
  /import \{ PageHeader \} from '\.\.\/components\/PageHeader';/g,
  `import PageHeader from '../components/PageHeader';`
);

content = content.replace(
  /import \{ KpiCard \} from '\.\.\/components\/KpiCard';/g,
  `import KpiCard from '../components/KpiCard';`
);

content = content.replace(
  /import \{ Skeleton \} from '\.\.\/components\/Skeleton';/g,
  `import Skeleton from '../components/Skeleton';`
);

content = content.replace(
  /import \{ EmptyState \} from '\.\.\/components\/EmptyState';/g,
  `import EmptyState from '../components/EmptyState';`
);

fs.writeFileSync('src/pages/Overview.tsx', content);
