const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/*.tsx');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (code.includes('TableSkeleton') && !code.includes('import { TableSkeleton }')) {
    code = code.replace(/import React([^;]*);/, "import React$1;\nimport { TableSkeleton } from '../components/Skeleton';");
    changed = true;
  }
  if (code.includes('EmptyState') && !code.includes('import { EmptyState }') && !code.includes('import {EmptyState}')) {
    code = code.replace(/import React([^;]*);/, "import React$1;\nimport { EmptyState } from '../components/EmptyState';");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, code);
  }
}
