const fs = require('fs');
let content = fs.readFileSync('src/lib/useAnalyticsData.ts', 'utf8');

content = `import { useClient } from './ClientContext';\n` + content;
content = content.replace(/const \{ startDate, endDate, filters \} = useFilters\(\);/, `const { startDate, endDate, filters } = useFilters();\n  const { selectedClient } = useClient();`);
content = content.replace(/queryKey: \['analytics', endpoint, startDate, endDate, filters, extraParams\]/, `queryKey: ['analytics', endpoint, selectedClient, startDate, endDate, filters, extraParams]`);
content = content.replace(/const params = new URLSearchParams\(\{ clientId: 'default' \}\);/, `const params = new URLSearchParams({ clientId: selectedClient || 'default' });`);

// "When changing client: clear existing analytical state immediately..."
// useQuery with new queryKey automatically fetches new data. To avoid showing stale data while loading, we should check if data is undefined or rely on isLoading.

fs.writeFileSync('src/lib/useAnalyticsData.ts', content);
