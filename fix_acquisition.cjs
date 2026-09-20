const fs = require('fs');
let content = fs.readFileSync('src/pages/Acquisition.tsx', 'utf8');

content = content.replace(/className="p-8 pb-20 flex items-center justify-center min-h-\[60vh\]"/, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in flex items-center justify-center min-h-[60vh]"');
content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"/, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-6"');

content = content.replace(/dateKey="date"\s*seriesKey="leads"\s*seriesName="Leads"/, 'xAxisKey="date"\n          currentKey="leads"');
content = content.replace(/dateKey="date"\s*seriesKey="spend"\s*seriesName="Spend"\s*isCurrency=\{true\}/, 'xAxisKey="date"\n          currentKey="spend"\n          valuePrefix="$"');

fs.writeFileSync('src/pages/Acquisition.tsx', content);
