const fs = require('fs');
let content = fs.readFileSync('src/pages/DataQuality.tsx', 'utf8');

// Replace custom title block with PageHeader
content = content.replace(/import \{ useAnalyticsData \} from '\.\.\/lib\/useAnalyticsData';/, "import { useAnalyticsData } from '../lib/useAnalyticsData';\nimport PageHeader from '../components/PageHeader';");

content = content.replace(/<div className="mb-8 flex items-center justify-between">[\s\S]*?<div>[\s\S]*?<h1 className="text-page-title">Data Quality<\/h1>[\s\S]*?<p className="text-secondary-text text-sm mt-1">Monitor ingestion health and semantic integrity of the lead ledger\.<\/p>[\s\S]*?<\/div>[\s\S]*?\{hasCritical \? \(([\s\S]*?)\) : \(([\s\S]*?)\)\}[\s\S]*?<\/div>/, `<PageHeader title="Data Quality" description="Monitor ingestion health and semantic integrity of the lead ledger.">
        {hasCritical ? (
          $1
        ) : (
          $2
        )}
      </PageHeader>`);

fs.writeFileSync('src/pages/DataQuality.tsx', content);
