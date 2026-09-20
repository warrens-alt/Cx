const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/*.tsx');

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  if (code.includes('No data available')) {
     code = code.replace(
       /<div className="p-8 pb-20 flex items-center justify-center min-h-\[60vh\]">[\s\n]*<div className="text-center">[\s\n]*<h2 className="text-section-title mb-4">No data available<\/h2>[\s\n]*<p className="text-secondary-text">Configure BigQuery in settings or check your data source\.<\/p>[\s\n]*<\/div>[\s\n]*<\/div>/g,
       '<div className="p-8"><EmptyState message="Configure BigQuery in settings or adjust your date filters." /></div>'
     );
     // Sometimes text-xl font-semibold ...
     code = code.replace(
       /<div className="p-8 pb-20 flex items-center justify-center min-h-\[60vh\]">[\s\n]*<div className="text-center">[\s\n]*<h2 className="text-xl font-semibold text-primary-text mb-2">No data available<\/h2>[\s\n]*<p className="text-secondary-text">Configure BigQuery in settings or check your data source\.<\/p>[\s\n]*<\/div>[\s\n]*<\/div>/g,
       '<div className="p-8"><EmptyState message="Configure BigQuery in settings or adjust your date filters." /></div>'
     );
     
     if (code.includes('<EmptyState') && !code.includes('EmptyState')) {
        code = code.replace(/import React/, "import { EmptyState } from '../components/EmptyState';\nimport React");
     }
     
     fs.writeFileSync(file, code);
  }
}
