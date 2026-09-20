const fs = require('fs');
let content = fs.readFileSync('src/pages/CallPerformance.tsx', 'utf8');

// standardise grid
content = content.replace(/className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-\[1440px\]:grid-cols-5 min-\[1920px\]:grid-cols-6 gap-4 mb-8"/, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-6"');

// remove double nesting
content = content.replace(/<div className="enterprise-card p-6 mb-8">\s*<div className="h-\[450px\] mb-8">/, '<div className="h-[450px] mb-6">');
// there is likely a closing div or table next. Let's find out how it ends.
fs.writeFileSync('src/pages/CallPerformance.tsx', content);
