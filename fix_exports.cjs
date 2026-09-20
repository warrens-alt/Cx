const fs = require('fs');
let content = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

content = content.replace(
  /import Skeleton from '\.\.\/components\/Skeleton';/g,
  `import { Skeleton } from '../components/Skeleton';`
);

content = content.replace(
  /import EmptyState from '\.\.\/components\/EmptyState';/g,
  `import { EmptyState } from '../components/EmptyState';`
);

fs.writeFileSync('src/pages/Overview.tsx', content);
