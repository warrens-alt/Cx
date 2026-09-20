const fs = require('fs');
let content = fs.readFileSync('src/pages/Outcomes.tsx', 'utf8');

content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-4"/, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-6"');
content = content.replace(/dateKey="date"\s*seriesKey="revenue"\s*seriesName="Revenue"\s*isCurrency=\{true\}/, 'xAxisKey="date"\n          currentKey="revenue"\n          valuePrefix="R "\n          height={330}');

content = content.replace(/isCurrency=\{true\}/g, 'valuePrefix="R "');

// the "No data available" container also needs standardisation
content = content.replace(/className="p-8 pb-20 flex items-center justify-center min-h-\[60vh\]"/, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in flex items-center justify-center min-h-[60vh]"');

fs.writeFileSync('src/pages/Outcomes.tsx', content);
