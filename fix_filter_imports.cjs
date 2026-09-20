const fs = require('fs');

let exp = fs.readFileSync('src/pages/Explore.tsx', 'utf8');
exp = exp.replace(
  /import \{ useGlobalFilters \} from '\.\.\/components\/GlobalFilters';/,
  "import { useFilters } from '../lib/FilterContext';"
);
exp = exp.replace(/useGlobalFilters\(\)/, 'useFilters()');
exp = exp.replace(/const \{ dateRange, source, vendor \} = useFilters\(\);/, 'const { startDate, endDate, source, vendor } = useFilters();\n  const dateRange = { start: startDate, end: endDate };');
fs.writeFileSync('src/pages/Explore.tsx', exp);

let ins = fs.readFileSync('src/pages/Insights.tsx', 'utf8');
ins = ins.replace(
  /import \{ useGlobalFilters \} from '\.\.\/components\/GlobalFilters';/,
  "import { useFilters } from '../lib/FilterContext';"
);
ins = ins.replace(/useGlobalFilters\(\)/, 'useFilters()');
ins = ins.replace(/const \{ dateRange \} = useFilters\(\);/, 'const { startDate, endDate } = useFilters();\n  const dateRange = { start: startDate, end: endDate };');
// Also trigger useEffect on startDate/endDate rather than dateRange, as object ref will change
ins = ins.replace(/\[dateRange\]\);/, '[startDate, endDate]);');

fs.writeFileSync('src/pages/Insights.tsx', ins);
