const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/*.tsx');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (code.includes('PageHeader') && !code.includes('import PageHeader')) {
    code = code.replace(/import React([^;]*);/, "import React$1;\nimport PageHeader from '../components/PageHeader';");
    changed = true;
  }
  if (code.includes('KpiCard') && !code.includes('import KpiCard')) {
    code = code.replace(/import React([^;]*);/, "import React$1;\nimport KpiCard from '../components/KpiCard';");
    changed = true;
  }
  if (code.includes('TableSkeleton') && !code.includes('TableSkeleton')) {
    // Already did this with fix_loaders.cjs but let's be sure. Actually let's just use regular expressions
  }
  if (code.includes('ChartSkeleton') && !code.includes('ChartSkeleton')) {
    code = code.replace(/import React([^;]*);/, "import React$1;\nimport { ChartSkeleton, Skeleton } from '../components/Skeleton';");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, code);
  }
}
