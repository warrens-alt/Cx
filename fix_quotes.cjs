const fs = require('fs');
let file = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');
file = file.replace(/value=\{filters\.calls\?\.operator === 'equals' \? String\(filters\.calls\.value\) : \(filters\.calls\?\.operator === 'between' \? .* : ''\)\}/, "value={filters.calls?.operator === 'equals' ? String(filters.calls.value) : (filters.calls?.operator === 'between' ? `${filters.calls.min}-${filters.calls.max}` : '')}");
fs.writeFileSync('src/components/GlobalFilter.tsx', file);
