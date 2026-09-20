const fs = require('fs');
let content = fs.readFileSync('src/pages/DataCoverage.tsx', 'utf8');

// Replace custom title block with PageHeader
content = content.replace(/import KpiCard from '\.\.\/components\/KpiCard';/, "import KpiCard from '../components/KpiCard';\nimport PageHeader from '../components/PageHeader';");

content = content.replace(/<div>\s*<h1 className="text-page-title">Data & Parameter Coverage<\/h1>\s*<p className="text-secondary-text text-sm mt-1">Audit of BigQuery semantic mapping and domain coverage.<\/p>\s*<\/div>/, '<PageHeader title="Data & Parameter Coverage" description="Audit of BigQuery semantic mapping and domain coverage." />');

// fix KpiCard grid
content = content.replace(/className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-\[1440px\]:grid-cols-5 min-\[1920px\]:grid-cols-6 gap-4"/, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-6"');

fs.writeFileSync('src/pages/DataCoverage.tsx', content);
