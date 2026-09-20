const fs = require('fs');
let file = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

file = file.replace(/className="flex items-center gap-6"/, 'className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full"');
file = file.replace(/className="bg-surface border-b border-border-subtle px-6 py-4 flex items-center justify-between z-10 sticky top-0 shrink-0 shadow-sm"/, 'className="bg-surface border-b border-border-subtle px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 sticky top-0 shrink-0 shadow-sm"');
file = file.replace(/className="flex flex-wrap items-center gap-4"/, 'className="flex flex-wrap items-center gap-3 md:gap-4"');

fs.writeFileSync('src/components/GlobalFilter.tsx', file);
